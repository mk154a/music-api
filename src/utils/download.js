const { spawn } = require('child_process');
const path = require('path');

const YTDLP_PATH = process.env.YTDLP_PATH || "C:\\yt-dlp\\yt-dlp.exe";
const COOKIES_PATH = process.env.COOKIES_PATH || path.resolve(__dirname, '../../yt-cookies/cookies.txt');

function downloadMp3(id, filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '--cookies', COOKIES_PATH,
      '--age-limit', '99',
      '--no-check-certificates',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--no-playlist',
      '--no-write-thumbnail',
      '--concurrent-fragments', '4',
      '--buffer-size', '16K',
      '-o', filePath,
      `https://www.youtube.com/watch?v=${id}`
    ];

    console.log(`[INFO] Downloading: ${id}`);
    const startTime = Date.now();
    
    const yt = spawn(YTDLP_PATH, args);
    let errorOutput = '';

    yt.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    yt.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        console.log(`[OK] Download completed: ${id} in ${duration}ms`);
        resolve();
      } else {
        console.error(`[ERROR] yt-dlp code ${code}: ${errorOutput}`);
        reject(new Error(`Download failed (code ${code}): ${errorOutput}`));
      }
    });

    yt.on('error', (err) => {
      console.error(`[ERROR] Spawn failed: ${err.message}`);
      reject(err);
    });
  });
}

module.exports = { downloadMp3 };
