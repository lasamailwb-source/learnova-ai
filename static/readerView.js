// 🎧 Learnova Reader View – load summary + print/save

document.addEventListener("DOMContentLoaded", () => {
  const readerContent = document.getElementById("readerContent");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const printBtn = document.getElementById("printBtn");

  // 1) Load summary from localStorage
  const storedSummary = localStorage.getItem("learnovaSummary");

  if (storedSummary && storedSummary.trim()) {
    // Use HTML so formatting (bold, line breaks) is kept
    readerContent.innerHTML = storedSummary;
  } else {
    readerContent.textContent =
      "No summary found. Please return to the main page and create a summary first.";
  }

  // 2) Simple text-to-speech using browser Speech API
  const synth = window.speechSynthesis;
  let utterance = null;

  playBtn.addEventListener("click", () => {
    const text = readerContent.innerText.trim();
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

  pauseBtn.addEventListener("click", () => {
    if (synth.speaking && !synth.paused) {
      synth.pause();      // pause
    } else if (synth.paused) {
      synth.resume();     // resume
    }
  });

  stopBtn.addEventListener("click", () => {
    synth.cancel();
  });

  // 3) Print / Save as PDF (browser dialog)
  printBtn.addEventListener("click", () => {
    window.print();
  });
});

