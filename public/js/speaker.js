let recording = false;
let recognition;
let finalTranscript = ""; // Store transcript for writing to file

async function uploadFiles() {
  const fileInput = document.getElementById("audioFiles");
  if (!fileInput.files.length) {
    alert("Please select audio files.");
    return;
  }

  const formData = new FormData();
  for (let file of fileInput.files) {
    formData.append("audio", file);
  }

  const response = await fetch("/transcribe", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  let allTranscripts = "";
  data.forEach((item, index) => {
    allTranscripts += `File ${index + 1}: ${
      item.text || "Failed to transcribe"
    }\n\n`;
  });
  document.getElementById("transcript").innerText = allTranscripts;
}

function toggleRecording() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Your browser does not support Speech Recognition.");
    return;
  }

  if (!recording) {
    recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript + " ";
      }
      document.getElementById("transcript").innerText = finalTranscript;
    };

    recognition.start();
    document.getElementById("recordBtn").innerText = "Stop Recording";
  } else {
    recognition.stop();
    document.getElementById("recordBtn").innerText = "Start Recording";

    // Get transcript content after stopping
    const transcript = document.getElementById("transcript").innerText.trim();

    if (transcript) {
      saveTranscript(transcript);
    } else {
      alert("No transcript available to save.");
    }
  }
  recording = !recording;
}

// Function to send transcript to the server
async function saveTranscript(transcript) {
  const response = await fetch("/save-transcript", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript }),
  });

  const data = await response.json();
  if (data.success) {
    alert("Transcript saved successfully! 🎉");
  } else {
    alert("Error saving transcript: " + data.error);
  }
}

async function searchKeyword() {
  const keyword = document.getElementById("keywordInput").value;
  const transcript = document.getElementById("transcript").innerText;

  if (!keyword) {
    alert("Please enter a keyword.");
    return;
  }

  const occurrences =
    transcript.toLowerCase().split(keyword.toLowerCase()).length - 1;
  document.getElementById(
    "keywordResults"
  ).innerText = `Keyword "${keyword}" found ${occurrences} times.`;

  const response = await fetch("/sentiment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: keyword }),
  });

  const data = await response.json();
  document.getElementById(
    "sentimentResults"
  ).innerText = `Sentiment: ${data.sentiment}`;
}

async function analyzeFiles() {
    const response = await fetch("/analyze_audio");
  const data = await response.json();

  if (data.error) {
    document.getElementById("resultSummary").innerText =
      "Error: " + data.error;
  } else {
    let results = "";
    data.forEach((item, index) => {
      results += `File ${index + 1}: ${item.result}\n\n`;
    });
    document.getElementById("resultSummary").innerText = results;
  }
}  