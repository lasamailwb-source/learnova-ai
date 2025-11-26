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
  const micBtn = document.getElementById("micBtn");

  let currentText = "";
  let currentUtterance = null;

  // ----------- Summarize ----------
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
      if (!res.ok) throw new Error(data.error);

      summaryOutput.innerHTML = data.summary.replace(/\n/g, "<br>");
      keywordsOutput.textContent = data.keywords.join(", ");

      currentText = summaryOutput.innerText;

    } catch (err) {
      summaryOutput.textContent = "❌ " + err.message;
    }
  });

  // ----------- Generate Quiz ----------
  quizBtn.addEventListener("click", async () => {
    const summary = summaryOutput.innerText.trim();
    if (!summary) return alert("Summarize first!");

    quizOutput.innerHTML = "⏳ Generating quiz...";

    try {
      const res = await fetch("/api/generate_quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      quizOutput.innerHTML = data.quiz.replace(/\n/g, "<br>");

    } catch (err) {
      quizOutput.innerHTML = "❌ " + err.message;
    }
  });

  // ----------- TTS Speak ----------
  speakBtn.addEventListener("click", () => {
    if (!currentText) return alert("Summarize first!");

    const utterance = new SpeechSynthesisUtterance(currentText);
    window.speechSynthesis.speak(utterance);
  });

  stopBtn.addEventListener("click", () => {
    window.speechSynthesis.cancel();
  });

  // ----------- Reader View -----------
  readerViewBtn.addEventListener("click", () => {
    if (!currentText) return alert("Summarize first!");
    localStorage.setItem("learnovaSummary", summaryOutput.innerHTML);
    window.open("/reader-view", "_blank");
  });

  // ----------- MICROPHONE (Speech-to-Text) -----------
  let recognition;
  let isRecording = false;

  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {

    const SpeechRecognition = 
      window.SpeechRecognition || window.webkitSpeechRecognition;

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    micBtn.onclick = () => {

      if (!isRecording) {
        recognition.start();
        isRecording = true;
        micBtn.textContent = "🎙️ Listening...";
      } else {
        recognition.stop();
      }
    };

    recognition.addEventListener("result", (e) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      textInput.value = textInput.value.trim() + " " + transcript;
    });

    recognition.addEventListener("end", () => {
      isRecording = false;
      micBtn.textContent = "🎤 Speak";
    });

  } else {
    micBtn.disabled = true;
    micBtn.title = "Speech recognition not supported on this browser.";
  }

});
