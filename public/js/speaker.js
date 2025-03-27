let recording = false;
let recognition;

async function uploadFiles() {
    const fileInput = document.getElementById("audioFiles");
    if (!fileInput.files.length) {
        alert("Please select an audio file.");
        return;
    }

    const formData = new FormData();
    for (let file of fileInput.files) {
        formData.append("audio", file);
    }

    const response = await fetch("/detect_speakers", {
        method: "POST",
        body: formData,
    });

    const data = await response.json();
    displayResults(data);
}

function toggleRecording() {
    if (!("webkitSpeechRecognition" in window)) {
        alert("Your browser does not support Speech Recognition.");
        return;
    }

    if (!recording) {
        recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = async (event) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + " ";
            }
            
            document.getElementById("transcript").innerText = transcript;
            const response = await fetch("/analyze_speech", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: transcript }),
            });

            const data = await response.json();
            displayResults(data);
        };

        recognition.start();
        document.getElementById("recordBtn").innerText = "Stop Recording";
    } else {
        recognition.stop();
        document.getElementById("recordBtn").innerText = "Start Recording";
    }
    recording = !recording;
}

function displayResults(data) {
    const resultsBox = document.getElementById("resultsBox");
    resultsBox.innerHTML = `
        <h3>Detected Speakers</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Speaker</th>
                    <th>Status</th>
                    <th>Key Info</th>
                </tr>
            </thead>
            <tbody>
                ${data.speakers.map(speaker => `
                    <tr>
                        <td>${speaker.name || "Unknown"}</td>
                        <td>${speaker.status}</td>
                        <td>${speaker.key_info.join(", ") || "None"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}
