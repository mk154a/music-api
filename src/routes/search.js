const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const play = require('play-dl');

const YTDLP_PATH = process.env.YTDLP_PATH || "C:\\yt-dlp\\yt-dlp.exe";
const COOKIES_PATH = process.env.COOKIES_PATH || path.resolve(__dirname, '../../yt-cookies/cookies.txt');

const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
}, 60 * 1000);

async function searchWithPlayDl(query, limit) {
  const results = await play.search(query, {
    limit: limit,
    source: { youtube: 'video' }
  });

  return results.map(video => ({
    id: video.id,
    title: video.title || 'Unknown',
    author: video.channel?.name || 'Unknown',
    duration: video.durationInSec || 0,
    thumbnail: video.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
  }));
}

function searchWithYtdlp(query, limit) {
  return new Promise((resolve, reject) => {
    const args = [
      '--cookies', COOKIES_PATH,
      '--age-limit', '99',
      '--no-warnings',
      '--no-check-certificates',
      '--ignore-errors',
      '--dump-json',
      `ytsearch${limit}:${query}`
    ];

    const yt = spawn(YTDLP_PATH, args);
    let output = '';
    let errorOutput = '';

    yt.stdout.on('data', (data) => {
      output += data.toString();
    });

    yt.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    const timeout = setTimeout(() => {
      yt.kill();
      reject(new Error('Search timeout'));
    }, 60000);

    yt.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code !== 0 && output.trim() === '') {
        return reject(new Error(`yt-dlp error: ${errorOutput}`));
      }

      try {
        const lines = output.trim().split('\n').filter(l => l.startsWith('{'));
        const results = lines.map(line => {
          try {
            const video = JSON.parse(line);
            
            let thumbnail = null;
            if (video.thumbnails && Array.isArray(video.thumbnails) && video.thumbnails.length > 0) {
              const thumbs = video.thumbnails.sort((a, b) => (b.width || 0) - (a.width || 0));
              thumbnail = thumbs[0]?.url || null;
            } else if (video.thumbnail && typeof video.thumbnail === 'string' && video.thumbnail.startsWith('http')) {
              thumbnail = video.thumbnail;
            } else if (video.id) {
              thumbnail = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
            }

            return {
              id: video.id,
              title: video.title || video.fulltitle || 'Unknown',
              author: video.channel || video.uploader || video.uploader_id || 'Unknown',
              duration: typeof video.duration === 'number' ? video.duration : 0,
              thumbnail: thumbnail
            };
          } catch (parseErr) {
            return null;
          }
        }).filter(r => r && r.id && r.id.length === 11);

        resolve(results);
      } catch (err) {
        reject(err);
      }
    });

    yt.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

router.get('/', async (req, res) => {
  const src = req.query.src;
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);
  const useYtdlp = req.query.ytdlp === 'true';
  
  if (!src) {
    return res.status(400).json({ error: "Parameter 'src' is required" });
  }

  const cacheKey = `${src.toLowerCase()}_${limit}`;
  const startTime = Date.now();

  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[CACHE] Returning ${cached.data.length} songs in ${Date.now() - startTime}ms`);
      return res.json(cached.data);
    }
  }

  try {
    console.log(`[INFO] Searching: "${src}" (limit: ${limit}, method: ${useYtdlp ? 'yt-dlp' : 'play-dl'})`);
    
    let results;
    
    if (useYtdlp) {
      results = await searchWithYtdlp(src, limit);
    } else {
      try {
        results = await searchWithPlayDl(src, limit);
      } catch (playDlError) {
        console.log(`[WARN] play-dl failed, using yt-dlp: ${playDlError.message}`);
        results = await searchWithYtdlp(src, limit);
      }
    }

    searchCache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

    console.log(`[OK] Returning ${results.length} songs in ${Date.now() - startTime}ms`);
    res.json(results);
    
  } catch (err) {
    console.error("[ERROR] Search failed:", err.message);
    res.status(500).json({ error: 'Failed to search songs', details: err.message });
  }
});

module.exports = router;
