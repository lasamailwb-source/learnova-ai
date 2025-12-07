// 🎧 Learnova Reader View – clean structured display + TTS

document.addEventListener("DOMContentLoaded", () => {
  const readerContent = document.getElementById("readerContent");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const printBtn = document.getElementById("printBtn");

  // 1) Load summary & keywords from localStorage
  // ✅ IMPORTANT: use the SAME keys as app.js
  const storedSummary = localStorage.getItem("learnova_summary");   // HTML with <br>
  const storedKeywords = localStorage.getItem("learnova_keywords") || "";

  if (storedSummary && storedSummary.trim()) {
    // Summary from dashboard already has <br> tags → keep as HTML
    readerContent.innerHTML = storedSummary;

    // Optional: show keywords at bottom
    if (storedKeywords) {
      const kwBlock = document.createElement("div");
      kwBlock.style.marginTop = "16px";
      kwBlock.style.fontSize = "0.9rem";
      kwBlock.style.opacity = "0.8";
      kwBlock.textContent = "KEYWORDS: " + storedKeywords;
      readerContent.appendChild(kwBlock);
    }

  } else {
    readerContent.textContent =
      "No summary found. Please return to the main page and create a summary first.";
  }

  // 2) Simple text-to-speech using browser Speech API
  const synth = window.speechSynthesis;
  let utterance = null;

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      const text = readerContent.innerText.trim();  // visible text only
      if (!text) {
        alert("There is no summary to read.");
        return;
      }

      if (synth.speaking) {
        synth.cancel();
      }

      utterance = new SpeechSynthesisUtterance(text);
      synth.speak(utterance);
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      if (synth.speaking && !synth.paused) {
        synth.pause();
      } else if (synth.paused) {
        synth.resume();
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      synth.cancel();
    });
  }

  // 3) Print / Save as PDF (browser dialog)
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
});
