const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

const app = express();
const PORT = 5000;

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('✅ MongoDB connected successfully!'))
    .catch((err) => {
        console.error(`❌ MongoDB connection error: ${err}`);
        process.exit(1);
    });

// Define User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, minlength: 4, maxlength: 16 },
    email: { type: String, required: true, unique: true, match: /^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/ },
    password: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

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

// Signup Route
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ error: 'Username or email already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
        });

        await user.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Server error during signup.' });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Server error during login.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/home.html'));
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/signup.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/login.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));