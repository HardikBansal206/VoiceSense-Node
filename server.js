const express = require("express");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const { GoogleGenerativeAI } = require("@google/generative-ai");

const geminiApiKey = process.env.GEMINI_API_KEY; // Add this key in your .env
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Define the path where transcript files will be saved
const uploadDir = path.join(__dirname, "uploads");

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Route to save transcript to a file
app.post("/save-transcript", async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ success: false, error: "No transcript provided" });
  }

  const fileName = `transcript_${Date.now()}-${uuidv4()}.txt`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFile(filePath, transcript, (err) => {
    if (err) {
      console.error("Error writing transcript:", err);
      return res.status(500).json({ success: false, error: "Error saving transcript" });
    }
    res.json({ success: true, message: "Transcript saved successfully", filePath });
  });
});

const { v4: uuidv4 } = require('uuid');
const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

app.post("/transcribe", upload.array("audio"), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No audio files uploaded" });
    }

    const results = [];
    for (const file of req.files) {
        const inputFilePath = file.path;
        const outputWavPath = inputFilePath.replace(/\.[^/.]+$/, ".wav");

        try {
            await convertToWav(inputFilePath, outputWavPath);
            const transcript = await transcribeWithWhisperCli(outputWavPath);
            fs.writeFileSync(path.join("./uploads/", path.basename(inputFilePath, path.extname(inputFilePath)) + ".txt"), transcript);
            results.push({ text: transcript });
        } catch (error) {
            console.error(error);
            results.push({ text: "Transcription failed" });
        }
    }
    res.json(results);
});

async function convertToWav(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        const ffmpegProcess = spawn(ffmpegPath, [
            "-i",
            inputFile,
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            outputFile,
        ]);

        ffmpegProcess.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg exited with code ${code}`));
            }
        });

        ffmpegProcess.stderr.on("data", (data) => {
            console.error(`FFmpeg stderr: ${data}`);
        });
    });
}

async function transcribeWithWhisperCli(filePath) {
    return new Promise((resolve, reject) => {
        const whisperCli = path.join(__dirname, "whisper.cpp", "build", "bin", "Release", "whisper-cli.exe");
        const modelPath = path.join(__dirname, "whisper.cpp", "ggml-large-v3.bin");
        //const modelPath = path.join(__dirname, "whisper.cpp", "ggml-base.en.bin");

        const whisperProcess = spawn(whisperCli, ["-m", modelPath, "-f", filePath]);

        let output = "";
        whisperProcess.stdout.on("data", (data) => (output += data.toString()));
        whisperProcess.on("close", (code) => (code === 0 ? resolve(output.trim()) : reject(new Error("Whisper failed"))));
    });
}

app.post('/sentiment', (req, res) => {
  const { text } = req.body;
  const tokens = tokenizer.tokenize(text);
  const sentiment = analyzer.getSentiment(tokens);
  let sentimentLabel = "Neutral";
    if (sentiment > 0) {
        sentimentLabel = "Positive";
    } else if (sentiment < 0) {
        sentimentLabel = "Negative";
    }
  res.json({ sentiment: sentimentLabel });
});

  // All process tables (Emergency, Urgency and Speaker)
  app.post("/process", async (req, res) => {
    const type = req.query.type;
    const transcriptFiles = fs
      .readdirSync("./uploads/")
      .filter((file) => file.endsWith(".txt"));
    console.log("Transcript files:", transcriptFiles);
    console.log(transcriptFiles);
  
    if (transcriptFiles.length === 0) {
      return res.status(404).json({ error: "No transcript files found" });
    }
  
    const results = [];
    if (type === "emergency") {
      console.log("Processing emergency detection...");
      for (const file of transcriptFiles) {
        const transcript = fs.readFileSync(path.join("./uploads/", file), "utf-8");
    
        try {
          // Step 1: Check for emergency detection
          const emergencyPrompt = `You are an expert in identifying emergencies. Given the transcript of a distress call or conversation, analyze and determine if there is any emergency situation described. Respond with 'YES' or 'NO' only.\n\nTranscript: ${transcript}`;
    
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const emergencyResult = await model.generateContent(emergencyPrompt);
          const isEmergency =
            emergencyResult.response?.candidates?.[0]?.content?.parts?.[0]?.text
              ?.trim()
              .toUpperCase() === "YES";
    
          if (isEmergency) {
            // Step 2: Get urgency, priority level, and probable emergency
            const analysisPrompt = `
              Analyze the following conversation transcript and return ONLY a valid JSON object with:
              {
                  "type": "safety(fire)/police/medical/none",
                  "location": "Location if mentioned, else 'Unknown'",
                  "issue": "Brief emergency description or say 'No issue'"
              }
              
              Transcript: ${transcript}
    
              Respond only with valid JSON. Do not include explanations or any extra text.
            `;
    
            const analysisResult = await model.generateContent(analysisPrompt);
            const analysisResponseText =
              analysisResult.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    
            // Extract JSON using regex
            const jsonMatch = analysisResponseText.match(/\{[\s\S]*\}/);
            let analysisData;
            try {
              analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            } catch (parseError) {
              console.error(`Error parsing analysis for ${file}:`, parseError);
              analysisData = {
                  type: "Unknown",
                  location: "Unknown",
                  issue: "Could not parse response",
              };
            }
    
            results.push({
              file,
              analysis: analysisData,
            });
          } else {
            results.push({
              file,
              analysis: {
                type: "Unknown",
                location: "Unknown",
                issue: "No emergency detected",
              },
            });
          }
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
          results.push({ file, result: "Error in processing" });
        }
      }
    
      res.json(results);
    } else if (type === "urgency") {
      console.log("Processing urgency detection...");
      for (const file of transcriptFiles) {
        const transcript = fs.readFileSync(path.join("./uploads/", file), "utf-8");
    
        try {
          // Step 1: Check for emergency detection
          const emergencyPrompt = `You are an expert in identifying emergencies. Given the transcript of a distress call or conversation, analyze and determine if there is any emergency situation described. Respond with 'YES' or 'NO' only.\n\nTranscript: ${transcript}`;
    
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const emergencyResult = await model.generateContent(emergencyPrompt);
          const isEmergency =
            emergencyResult.response?.candidates?.[0]?.content?.parts?.[0]?.text
              ?.trim()
              .toUpperCase() === "YES";
    
          if (isEmergency) {
            // Step 2: Get urgency, priority level, and probable emergency
            const analysisPrompt = `
              Analyze the following conversation transcript and return ONLY a valid JSON object with:
              {
                "urgency": "Low/Moderate/High/Critical",
                "priority_level": 1-5,
                "probable_emergency": "Brief emergency description"
              }
              
              Transcript: ${transcript}
            `;
    
            const analysisResult = await model.generateContent(analysisPrompt);
            const analysisResponseText =
              analysisResult.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    
            // Extract JSON using regex
            const jsonMatch = analysisResponseText.match(/\{[\s\S]*\}/);
            let analysisData;
            try {
              analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            } catch (parseError) {
              console.error(`Error parsing analysis for ${file}:`, parseError);
              analysisData = {
                urgency: "Unknown",
                priority_level: "N/A",
                probable_emergency: "Unable to parse analysis",
              };
            }
    
            results.push({
              file,
              analysis: analysisData,
            });
          } else {
            results.push({
              file,
              analysis: {
                urgency: "N/A",
                priority_level: "N/A",
                probable_emergency: "No emergency detected",
              },
            });
          }
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
          results.push({ file, result: "Error in processing" });
        }
      }
    
      res.json(results);
    } else if (type === "speaker") {
      console.log("Processing speaker detection...");
      for (const file of transcriptFiles) {
        const transcript = fs.readFileSync(path.join("./uploads/", file), "utf-8");
    
        try {
          
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            // Step 1: Get speaker details
            const analysisPrompt = `You are an expert in identifying speakers.
              Analyze the following conversation transcript and return ONLY a valid JSON object with:
              {
                "number_of_speakers": Number,
                "script": "Clean dialogue script here...",
                "speaker_intro": "A short paragraph about the speakers"
              }
              
              Transcript: ${transcript}
            `;
    
            const analysisResult = await model.generateContent(analysisPrompt);
            const analysisResponseText =
              analysisResult.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    
            // Extract JSON using regex
            const jsonMatch = analysisResponseText.match(/\{[\s\S]*\}/);
            let analysisData;
            try {
              analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

              // Post-process script: Ensure each "Speaker X:" line starts on a new line
              if (analysisData.script) {
                analysisData.script = analysisData.script.replace(/(Speaker\s\d+:)/g, '<br>$1').trim();
                console.log("Processed script:", analysisData.script);
              }

            } catch (parseError) {
              console.error(`Error parsing analysis for ${file}:`, parseError);
              analysisData = {
                number_of_speakers: "Unknown",
                script: "N/A",
                speaker_intro: "Can't be generated",
              };
            }
    
            results.push({
              file,
              analysis: analysisData,
            });
          }
         catch (error) {
          console.error(`Error processing file ${file}:`, error);
          results.push({ file, result: "Error in processing" });
        }
      }
    
      res.json(results);
    }

  });

  
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/index.html'));
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/signup.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/login.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/dashboard.html'));
});

app.get('/home.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/home.html'));
});

app.get('/emergency.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/emergency.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));