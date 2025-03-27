const express = require("express");
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

const app = express();
const PORT = 5000;

const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });
app.use(express.json());
app.use(express.static("public"));

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
        const ffmpegProcess = spawn("ffmpeg", [
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
            code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`));
        });

        ffmpegProcess.stderr.on("data", (data) => console.error(`FFmpeg stderr: ${data}`));
    });
}

async function transcribeWithWhisperCli(filePath) {
    return new Promise((resolve, reject) => {
        const whisperCli = path.join(__dirname, "whisper.cpp", "build", "bin", "Release", "whisper-cli.exe");
        // const modelPath = path.join(__dirname, "whisper.cpp", "ggml-large-v3.bin");
        const modelPath = path.join(__dirname, "whisper.cpp", "ggml-base.en.bin");

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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));