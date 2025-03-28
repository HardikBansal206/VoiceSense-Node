const path = require("path");
const fs = require("fs");
const modelPath = path.join(__dirname, "whisper.cpp", "ggml-base.en.bin");
const whisperCli = path.join(__dirname, "whisper.cpp", "build", "bin", "Release", "whisper-cli.exe");
console.log(whisperCli);
console.log(modelPath);