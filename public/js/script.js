
const themeToggle = document.getElementById("theme-toggle");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");

  if (document.body.classList.contains("dark-theme")) {
    themeToggle.textContent = "☀️";
  } else {
    themeToggle.textContent = "🌙";
  }
});

const fileUploadDiv = document.getElementById("file-upload");
const audioInput = document.getElementById("audio-file");

fileUploadDiv.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileUploadDiv.style.borderColor = "#30ff0b";
});

fileUploadDiv.addEventListener("dragleave", (e) => {
  e.preventDefault();
  fileUploadDiv.style.borderColor = "#666";
});

fileUploadDiv.addEventListener("drop", (e) => {
  e.preventDefault();
  fileUploadDiv.style.borderColor = "#666";

  const files = e.dataTransfer.files;
  handleFileUpload(files);
});

audioInput.addEventListener("change", () => {
  const files = audioInput.files;
  handleFileUpload(files);
});

function handleFileUpload(files) {
  if (files.length > 0) {
    let fileNames = [];
    for (let i = 0; i < files.length; i++) {
      fileNames.push(files[i].name);
    }
    alert(`Uploaded files: ${fileNames.join(", ")}`);
  } else {
    alert("No files selected.");
  }
}

const startRecordingButton = document.getElementById("start-recording");
const stopRecordingButton = document.getElementById("stop-recording");
const audioVisualization = document.getElementById("audio-visualization");
const detectedKeywords = document.getElementById("detected-keywords");

startRecordingButton.addEventListener("click", () => {
  alert("Recording started! (This is a placeholder for real-time detection functionality.)");
  audioVisualization.style.backgroundColor = "#30ff0b";
});

stopRecordingButton.addEventListener("click", () => {
  alert("Recording stopped! (This is a placeholder for real-time detection functionality.)");
  audioVisualization.style.backgroundColor = "";
});
