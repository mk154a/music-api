const express = require('express');
const router = express.Router();

const serverStartTime = Date.now();

router.get('/', (req, res) => {
  const now = Date.now();
  const uptimeInSeconds = Math.floor((now - serverStartTime) / 1000);
  const uptimeFormatted = formatUptime(uptimeInSeconds);
  res.json({ uptime: uptimeFormatted });
});

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (seconds < 60) {
    return `${s}s`;
  } else if (seconds < 86400) {
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  } else {
    return `${d}d ${h}h`;
  }
}


module.exports = router;
