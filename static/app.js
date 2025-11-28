document.addEventListener("DOMContentLoaded", () => {
  const uploadForm = document.getElementById("uploadForm");
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
  const micLabel = document.getElementById("micLabel");

  /* -----------------------------
       Helper: show / hide loading
  ------------------------------ */
  function setSummaryLoading(isLoading) {
    if (isLoading) {
      summaryOutput.textContent = "⏳ Summarizing your notes...";
      keywordsOutput.textContent = "";
    }
  }

  function setQuizLoading(isLoading) {
    if (isLoading) {
      quizOutput.textContent = "🎲 Generating quiz questions...";
    }
  }

  /* -----------------------------
         SUMMARIZE / UPLOAD
  ------------------------------ */
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData();

      const rawText = (textInput.value || "").trim();
      if (rawText) {
        formData.append("text", rawText);
      } else if (fileInput.files.length > 0) {
        formData.append("file", fileInput.files[0]);
      } else {
        alert("Please type text or upload a file first.");
        return;
      }

      summarizeBtn.disabled = true;
      setSummaryLoading(true);

      try {
        const res = await fetch("/api/processnotes", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          summaryOutput.textContent = data.error || "An error occurred.";
          keywordsOutput.textContent = "";
          return;
        }

        summaryOutput.textContent = data.summary || "No summary returned.";
        keywordsOutput.textContent = data.keywords || "No keywords returned.";
      } catch (err) {
        console.error(err);
        summaryOutput.textContent = "Error connecting to server.";
        keywordsOutput.textContent = "";
      } finally {
        summarizeBtn.disabled = false;
      }
    });
  }

  /* -----------------------------
              QUIZ
  ------------------------------ */
  if (quizBtn) {
    quizBtn.addEventListener("click", async () => {
      const summaryText = (summaryOutput.textContent || "").trim();
      if (!summaryText) {
        alert("Please summarize some text first.");
        return;
      }

      setQuizLoading(true);

      try {
        const res = await fetch("/api/generate_quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: summaryText,
            question_count: 10,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          quizOutput.textContent = data.error || "Quiz generation failed.";
          return;
        }

        quizOutput.textContent = data.quiz || "No quiz returned.";
      } catch (err) {
        console.error(err);
        quizOutput.textContent = "Error connecting to server.";
      } finally {
        setQuizLoading(false);
      }
    });
  }

  /* -----------------------------
           TEXT TO SPEECH
  ------------------------------ */
  let currentUtterance = null;

  function speakSummary() {
    const text = (summaryOutput.textContent || "").trim();
    if (!text) {
      alert("No summary to speak.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (currentUtterance) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.onend = () => {
      currentUtterance = null;
    };

    currentUtterance = utter;
    window.speechSynthesis.speak(utter);
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    }
  }

  if (speakBtn) speakBtn.addEventListener("click", speakSummary);
  if (stopBtn) stopBtn.addEventListener("click", stopSpeech);

  /* -----------------------------
           READER VIEW
  ------------------------------ */
  if (readerViewBtn) {
    readerViewBtn.addEventListener("click", () => {
      const summaryText = (summaryOutput.textContent || "").trim();
      const keywordsText = (keywordsOutput.textContent || "").trim();

      // Simple way: put in localStorage and open reader-view
      try {
        localStorage.setItem("learnova_summary", summaryText);
        localStorage.setItem("learnova_keywords", keywordsText);
      } catch (e) {
        console.warn("LocalStorage not available", e);
      }

      window.open("/reader-view", "_blank");
    });
  }

  /* -----------------------------
       MICROPHONE – STYLE C
       Real-time speech-to-text
  ------------------------------ */
  let recognition = null;
  let isListening = false;
  let finalTranscript = "";

  function cleanTranscript(text) {
    if (!text) return "";

    // Remove extra spaces
    text = text.replace(/\s+/g, " ").trim();

    // Basic filler removal (optional)
    const fillers = ["uh", "um", "er", "ah"];
    const pattern = new RegExp("\\b(" + fillers.join("|") + ")\\b", "gi");
    text = text.replace(pattern, "").replace(/\s+/g, " ").trim();

    return text;
  }

  function addLightPunctuation(text) {
    if (!text) return "";

    text = text.trim();

    // Capitalize first letter
    text = text.charAt(0).toUpperCase() + text.slice(1);

    // Add period if missing
    if (!/[.!?]$/.test(text)) {
      text += ".";
    }

    return text;
  }

  function initRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = true; // better streaming

    rec.onstart = () => {
      isListening = true;
      if (micBtn) {
        micBtn.setAttribute("data-state", "listening");
      }
      if (micLabel) {
        micLabel.textContent = "Listening... tap to stop";
      }
    };

    rec.onerror = (e) => {
      console.warn("Speech recognition error:", e);
    };

    rec.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += " " + transcript;
          finalTranscript = cleanTranscript(finalTranscript);
        } else {
          interimTranscript += " " + transcript;
        }
      }

      const combined =
        (finalTranscript + " " + interimTranscript).replace(/\s+/g, " ").trim();

      textInput.value = combined;
    };

    rec.onend = () => {
      // Stopped (user or silence)
      isListening = false;

      if (micBtn) {
        micBtn.setAttribute("data-state", "idle");
      }
      if (micLabel) {
        micLabel.textContent = "Tap to speak";
      }

      // Final cleanup + light punctuation
      let cleaned = cleanTranscript(textInput.value);
      cleaned = addLightPunctuation(cleaned);
      textInput.value = cleaned;
    };

    return rec;
  }

  function startListening() {
    if (!recognition) {
      recognition = initRecognition();
      if (!recognition) return;
    }

    if (isListening) return;

    // Start from any existing text
    finalTranscript = (textInput.value || "").trim();
    try {
      recognition.start();
    } catch (e) {
      console.warn("Recognition already started:", e);
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
    }
  }

  if (micBtn) {
    micBtn.addEventListener("click", () => {
      if (!recognition && !("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }

      if (!recognition) {
        recognition = initRecognition();
        if (!recognition) return;
      }

      if (!isListening) {
        startListening();
      } else {
        stopListening();
      }
    });
  }

  /* -----------------------------
        EXPORT PDF (Summary + Quiz)
  ------------------------------ */
  const exportBtn = document.getElementById("exportPdfBtn");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const summaryText = (summaryOutput.textContent || "").trim();
      const quizText = (quizOutput.textContent || "").trim();

      if (!summaryText && !quizText) {
        alert("No summary or quiz available to export.");
        return;
      }

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      const leftMargin = 40;
      let y = 60;

      // Title
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Learnova AI - Study Report", leftMargin, y);
      y += 30;

      // Date
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("Generated on: " + new Date().toLocaleString(), leftMargin, y);
      y += 25;

      // ----- SUMMARY -----
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("Summary", leftMargin, y);
      y += 20;

      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(12);

      const summaryLines = pdf.splitTextToSize(summaryText, 520);
      summaryLines.forEach(line => {
        if (y > 780) {  // new page
          pdf.addPage();
          y = 60;
        }
        pdf.text(line, leftMargin, y);
        y += 16;
      });

      // ----- QUIZ -----
      if (quizText) {
        y += 20;
        if (y > 760) {
          pdf.addPage();
          y = 60;
        }

        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("Quiz", leftMargin, y);
        y += 20;

        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(12);

        const quizLines = pdf.splitTextToSize(quizText, 520);
        quizLines.forEach(line => {
          if (y > 780) {
            pdf.addPage();
            y = 60;
          }
          pdf.text(line, leftMargin, y);
          y += 16;
        });
      }

      pdf.save("Learnova_Report.pdf");
    });
  }
  
  
});

