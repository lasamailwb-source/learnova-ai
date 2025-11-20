// 🎧 Learnova AI Assistant – Real Player-like Speech Controls

const speakBtn = document.getElementById("speakBtn");
const stopBtn = document.getElementById("stopBtn");
const speedRange = document.getElementById("speedRange");
const speedLabel = document.getElementById("speedLabel");
const progressRange = document.getElementById("progressRange");
const summaryBox = document.getElementById("summaryOutput");

const synth = window.speechSynthesis;

let utterance = null;
let fullText = "";
let startChar = 0;
let pausedChar = 0;
let isPaused = false;
let isDragging = false;
let durationEstimate = 0;
let startTime = 0;
let progressTimer = null;

// 🧮 Estimate speaking duration (chars × factor)
function estimateDuration(text, rate) {
  const words = text.trim().split(/\s+/).length;
  const base = words * 0.4; // ≈0.4s per word
  return base / rate;
}

// 🔄 Reset all UI
function resetSpeechUI() {
  clearInterval(progressTimer);
  progressRange.value = 0;
  speakBtn.textContent = "🔊 Speak";
  isPaused = false;
}

// 🗣️ Speak from a given character index
function speakFrom(index = 0) {
  fullText = summaryBox.innerText || "";
  if (!fullText.trim()) {
    alert("Nothing to speak. Please summarise first.");
    return;
  }

  synth.cancel(); // stop any previous speech
  utterance = new SpeechSynthesisUtterance(fullText.slice(index));
  utterance.rate = parseFloat(speedRange.value);

  durationEstimate = estimateDuration(fullText.slice(index), utterance.rate);
  startTime = Date.now();

  utterance.onstart = () => {
    speakBtn.textContent = "⏸ Pause";
    clearInterval(progressTimer);
    progressTimer = setInterval(updateProgress, 100);
  };

  utterance.onend = () => {
    clearInterval(progressTimer);
    progressRange.value = 100;
    speakBtn.textContent = "🔊 Speak";
    isPaused = false;
  };

  synth.speak(utterance);
}

// 📈 Update progress bar
function updateProgress() {
  if (!isDragging && !isPaused && durationEstimate > 0) {
    const elapsed = (Date.now() - startTime) / 1000;
    const percent = Math.min((elapsed / durationEstimate) * 100, 100);
    progressRange.value = percent;
  }
}

// 🎛️ Change speed instantly
speedRange.addEventListener("input", () => {
  const rate = parseFloat(speedRange.value);
  speedLabel.textContent = rate.toFixed(1) + "x";
  if (utterance && synth.speaking) {
    synth.cancel();
    speakFrom(Math.floor((progressRange.value / 100) * fullText.length));
  }
});

// ▶️ / ⏸ Toggle
speakBtn.addEventListener("click", () => {
  if (!synth.speaking && !isPaused) {
    speakFrom(0);
  } else if (synth.speaking && !isPaused) {
    synth.pause();
    isPaused = true;
    pausedChar = Math.floor((progressRange.value / 100) * fullText.length);
    speakBtn.textContent = "▶ Resume";
  } else if (isPaused) {
    synth.resume();
    isPaused = false;
    speakBtn.textContent = "⏸ Pause";
  }
});

// ⏹ Stop
stopBtn.addEventListener("click", () => {
  synth.cancel();
  resetSpeechUI();
});

// 🎚 Seek manually
progressRange.addEventListener("mousedown", () => (isDragging = true));
progressRange.addEventListener("touchstart", () => (isDragging = true));

function handleSeek() {
  const percent = parseFloat(progressRange.value);
  const index = Math.floor((percent / 100) * fullText.length);
  synth.cancel();
  isDragging = false;
  speakFrom(index);
}

progressRange.addEventListener("mouseup", handleSeek);
progressRange.addEventListener("touchend", handleSeek);
