// 🎯 Learnova AI Assistant - Clean Simplified Version (no speed, progress, or export PDF on main page)

document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const fileInput = document.getElementById("fileInput");
  const summarizeBtn = document.getElementById("summarizeBtn");
  const summaryOutput = document.getElementById("summaryOutput");
  const keywordsOutput = document.getElementById("keywordsOutput");
  const quizBtn = document.getElementById("quizBtn");
  const quizOutput = document.getElementById("quizOutput");
  const speakBtn = document.getElementById("speakBtn");
  const stopBtn = document.getElementById("stopBtn");
  const readerViewBtn = document.getElementById("readerViewBtn");

  let currentText = "";
  let currentUtterance = null;
  let isPaused = false;

  // ---------- Summarize ----------
  summarizeBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    const file = fileInput.files[0];

    if (!text && !file) {
      alert("Please enter text or upload a file.");
      return;
    }

    const formData = new FormData();
    if (text) formData.append("text", text);
    if (file) formData.append("file", file);

    summaryOutput.textContent = "⏳ Summarizing...";
    keywordsOutput.textContent = "";
    quizOutput.textContent = "";

    try {
      const res = await fetch("/api/processnotes", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize.");

      summaryOutput.innerHTML = data.summary
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

      if (Array.isArray(data.keywords)) {
        keywordsOutput.textContent = data.keywords.join(", ");
      } else {
        keywordsOutput.textContent = data.keywords || "No keywords found.";
      }

      currentText = summaryOutput.innerText;

    } catch (err) {
      summaryOutput.textContent = "❌ " + err.message;
      console.error(err);
    }
  });

  // ---------- Generate Quiz ----------
  quizBtn.addEventListener("click", async () => {
    const summary = summaryOutput.innerText.trim();
    if (!summary) {
      alert("Please summarize first!");
      return;
    }

    quizOutput.innerHTML = "⏳ Generating quiz...";
    try {
      const response = await fetch("/api/generate_quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Quiz generation failed.");

      quizOutput.innerHTML = data.quiz
        .replace(/\n/g, "<br>")
        .replace(/Q:/g, "<strong>Q:</strong>")
        .replace(/A:/g, "<strong>A:</strong>");
    } catch (err) {
      quizOutput.innerHTML = "❌ " + err.message;
    }
  });

  // ---------- Text-to-Speech ----------
  speakBtn.addEventListener("click", () => {
    if (!currentText) return alert("Please summarize text first!");

    if (isPaused && currentUtterance) {
      window.speechSynthesis.resume();
      isPaused = false;
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    currentUtterance = new SpeechSynthesisUtterance(
      summaryOutput.innerText || currentText
    );

    // 🔇 Clean text (remove emojis/symbols)
    const cleanText = currentUtterance.text.replace(/[^\w\s,.!?;:'"-]/g, "");
    currentUtterance.text = cleanText;

    window.speechSynthesis.speak(currentUtterance);
    currentUtterance.onend = () => (isPaused = false);
  });

  stopBtn.addEventListener("click", () => {
    window.speechSynthesis.cancel();
    isPaused = false;
  });

  // ---------- Reader View ----------
  readerViewBtn.addEventListener("click", () => {
    if (!currentText) {
      alert("Please summarize text first!");
      return;
    }

    // Save summary content for reader view
    localStorage.setItem("learnovaSummary", summaryOutput.innerHTML);
    window.open("/reader-view", "_blank");
  });
});
