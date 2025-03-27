document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("audioFiles");
    const urgencyTableBody = document.getElementById("urgencyTableBody");

    async function uploadFiles() {
        if (!fileInput.files.length) {
            alert("Please select audio files.");
            return;
        }

        const formData = new FormData();
        for (let file of fileInput.files) {
            formData.append("audio", file);
        }

        try {
            const response = await fetch("/classify_urgency", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            urgencyTableBody.innerHTML = ""; // Clear previous results

            data.forEach((entry, index) => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${entry.fileName}</td>
                    <td>${entry.priority}</td>
                    <td>${entry.urgencyLevel}</td>
                    <td>${entry.type}</td>
                `;

                urgencyTableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Error uploading files:", error);
            alert("Error processing files. Please try again.");
        }
    }

    document.getElementById("uploadBtn").addEventListener("click", uploadFiles);
});
