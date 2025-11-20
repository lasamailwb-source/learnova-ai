// readerView.js
function openReaderView(summaryHTML) {
  const width = 900;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  const readerWindow = window.open(
    "",
    "_blank",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes`
  );

  // Build Reader View HTML dynamically
  readerWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>📰 Reader View - Learnova AI Assistant</title>
      <style>
        body {
          font-family: 'Poppins', sans-serif;
          background: #f9fafc;
          color: #222;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
          overflow-y: auto;
        }
        h1 {
          color: #4b3eff;
          font-size: 24px;
          text-align: center;
        }
        .toolbar {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin: 15px 0 25px;
        }
        .toolbar button {
          background: #4b3eff;
          border: none;
          color: white;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: 0.3s;
        }
        .toolbar button:hover {
          background: #352bd8;
        }
        .summary-content {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          max-width: 850px;
          margin: 0 auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow-y: auto;
          max-height: 480px;
        }
        .summary-content h2 {
          color: #4b3eff;
          border-bottom: 2px solid #eee;
          padding-bottom: 4px;
        }
        .summary-content p {
          margin-bottom: 10px;
        }
        footer {
          text-align: center;
          font-size: 12px;
          color: #888;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <h1>📖 Reader View</h1>
      <div class="toolbar">
        <button id="playBtn">▶ Play</button>
        <button id="pauseBtn">⏸ Pause</button>
        <button id="stopBtn">⏹ Stop</button>
        <button id="printBtn">🖨 Print / Export</button>
      </div>

      <div class="summary-content" id="readerContent">${summaryHTML}</div>

      <footer>© 2025 Learnova AI Assistant | Reader Mode</footer>

      <script>
        // --- Text-to-Speech setup
        const synth = window.speechSynthesis;
        let utterance;
        let isPaused = false;

        document.getElementById('playBtn').onclick = () => {
          const text = document.getElementById('readerContent').innerText
            .replace(/[•🔹🔸✅⭐️📍]/g, ' ') // remove emojis and bullet icons
            .replace(/\\s+/g, ' ')
            .trim();

          if (synth.speaking && isPaused) {
            synth.resume();
            isPaused = false;
            return;
          }
          if (synth.speaking) return;

          utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          synth.speak(utterance);
        };

        document.getElementById('pauseBtn').onclick = () => {
          if (synth.speaking && !isPaused) {
            synth.pause();
            isPaused = true;
          }
        };

        document.getElementById('stopBtn').onclick = () => {
          synth.cancel();
          isPaused = false;
        };

        // --- Print/Export Button
        document.getElementById('printBtn').onclick = () => {
          readerWindow.print();
        };

        window.onbeforeunload = () => synth.cancel();
      </script>
    </body>
    </html>
  `);

  readerWindow.document.close();
}
