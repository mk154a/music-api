require('dotenv').config();
const express = require('express');
const cors = require('cors');
const searchRoute = require('./routes/search');
const playRoute = require('./routes/play');
const uptimeRoute = require('./routes/uptime');

const app = express();
app.use(cors());

app.use('/uptime', uptimeRoute);
app.use('/search', searchRoute);
app.use('/play', playRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Music API running on port ${PORT}`);
});
