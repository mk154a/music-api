const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { downloadMp3 } = require('../utils/download');

const CACHE_DIR = process.env.CACHE_DIR || path.resolve(__dirname, '..', 'mp3-cache');
const MAX_CACHE_SIZE = parseInt(process.env.MAX_CACHE_SIZE) || 100;
const CACHE_MAX_AGE_HOURS = parseInt(process.env.CACHE_MAX_AGE_HOURS) || 24;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const downloadPromises = new Map();

function cleanOldCache() {
  try {
    const files = fs.readdirSync(CACHE_DIR)
      .filter(f => f.endsWith('.mp3'))
      .map(f => ({
        name: f,
        path: path.join(CACHE_DIR, f),
        time: fs.statSync(path.join(CACHE_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    const maxAge = CACHE_MAX_AGE_HOURS * 60 * 60 * 1000;
    const now = Date.now();

    files.forEach((file, index) => {
      const isOld = (now - file.time) > maxAge;
      const isExcess = index >= MAX_CACHE_SIZE;
      
      if (isOld || isExcess) {
        try {
          fs.unlinkSync(file.path);
          console.log(`[CACHE] Removed: ${file.name}`);
        } catch (e) {}
      }
    });
  } catch (err) {
    console.error('[CACHE] Error cleaning cache:', err.message);
  }
}

setInterval(cleanOldCache, 30 * 60 * 1000);
cleanOldCache();

function isValidYouTubeId(id) {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

router.get('/', async (req, res) => {
  const id = req.query.id;
  
  if (!id) {
    return res.status(400).json({ error: "Parameter 'id' is required" });
  }

  if (!isValidYouTubeId(id)) {
    return res.status(400).json({ error: "Invalid YouTube ID" });
  }

  const filePath = path.resolve(CACHE_DIR, `${id}.mp3`);
  const startTime = Date.now();

  if (fs.existsSync(filePath)) {
    console.log(`[CACHE HIT] ${id} in ${Date.now() - startTime}ms`);
    const now = new Date();
    fs.utimesSync(filePath, now, now);
    return res.sendFile(filePath);
  }

  if (downloadPromises.has(id)) {
    console.log(`[INFO] Waiting for download in progress: ${id}`);
    try {
      await downloadPromises.get(id);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      return res.status(500).json({ error: 'Download failed' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to download song' });
    }
  }

  console.log(`[INFO] Starting download: ${id}`);
  
  const downloadPromise = downloadMp3(id, filePath)
    .finally(() => {
      downloadPromises.delete(id);
    });

  downloadPromises.set(id, downloadPromise);

  try {
    await downloadPromise;
    
    if (fs.existsSync(filePath)) {
      console.log(`[OK] Serving: ${id} in ${Date.now() - startTime}ms`);
      return res.sendFile(filePath);
    }
    
    return res.status(500).json({ error: 'File not found after download' });
  } catch (err) {
    console.error(`[ERROR] Download failed for ${id}:`, err.message);
    return res.status(500).json({ error: 'Failed to download song' });
  }
});

router.get('/status', (req, res) => {
  const id = req.query.id;
  
  if (!id || !isValidYouTubeId(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const filePath = path.resolve(CACHE_DIR, `${id}.mp3`);
  const cached = fs.existsSync(filePath);
  const downloading = downloadPromises.has(id);

  res.json({
    id,
    cached,
    downloading,
    status: cached ? 'ready' : (downloading ? 'downloading' : 'not_cached')
  });
});

module.exports = router;
