
async function classifyUrgency() {
  const files = document.getElementById("audioFiles").files;

  if (files.length === 0) {
    alert("Please upload at least one file.");
    return;
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  try {
    const response = await fetch("http://localhost:5000/process?type=urgency", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Error processing files.");
    }

    const results = await response.json();
    populateResults(results);
  } catch (error) {
    console.error("Error:", error);
  }
}

function populateResults(results) {
  const resultsTable = document.getElementById("resultsTable");
  resultsTable.innerHTML = ""; // Clear previous results

  results.forEach((result) => {
      const row = `
      <tr>
        <td>${result.file.replace(".txt", ".wav")}</td>
        <td>${result.analysis?.urgency || "N/A"}</td>
        <td>${result.analysis?.priority_level || "N/A"}</td>
        <td>${result.analysis?.probable_emergency || "No emergency detected"}</td>
      </tr>
    `;
    resultsTable.innerHTML += row;
  });
}

