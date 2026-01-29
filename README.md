# Music API

REST API to search and download YouTube music in MP3 format. Built for use with MTA:SA (Multi Theft Auto).

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed on your system
- [FFmpeg](https://ffmpeg.org/) (required for audio conversion)

## Installation

```bash
git clone https://github.com/your-username/music-api.git
cd music-api
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
PORT=3000
CACHE_DIR=./mp3-cache
YTDLP_PATH=C:\yt-dlp\yt-dlp.exe
COOKIES_PATH=./yt-cookies/cookies.txt
MAX_CACHE_SIZE=100
CACHE_MAX_AGE_HOURS=24
```

### YouTube Cookies (Optional)

To access age-restricted music (18+), you need to export cookies from your YouTube account:

1. Install the [Get cookies.txt](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) extension in your browser
2. Go to YouTube and log in to your account
3. Click the extension and export the cookies
4. Save the file as `yt-cookies/cookies.txt`

## Usage

### Start the API

```bash
node src/app.js
```

The API will be available at `http://localhost:3000`

### Endpoints

#### Search music

```
GET /search?src=song+name
```

Parameters:
- `src` (required): search term
- `limit` (optional): number of results (default: 5, max: 20)
- `ytdlp` (optional): use yt-dlp for search (`true`/`false`)

Response example:
```json
[
  {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "author": "Rick Astley",
    "duration": 213,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  }
]
```

#### Download/Play music

```
GET /play?id=VIDEO_ID
```

Parameters:
- `id` (required): YouTube video ID (11 characters)

Returns the MP3 file directly.

#### Check cache status

```
GET /play/status?id=VIDEO_ID
```

Response example:
```json
{
  "id": "dQw4w9WgXcQ",
  "cached": true,
  "downloading": false,
  "status": "ready"
}
```

Possible status: `ready`, `downloading`, `not_cached`

#### Health check

```
GET /uptime
```

## MTA:SA Usage

Lua script example to use the API:

```lua
local API_URL = "http://localhost:3000"

function searchMusic(term, callback)
    fetchRemote(API_URL .. "/search?src=" .. urlEncode(term), function(data, err)
        if err == 0 then
            local songs = fromJSON(data)
            callback(songs)
        end
    end)
end

function playMusic(id)
    local url = API_URL .. "/play?id=" .. id
    local sound = playSound(url)
    return sound
end

-- Usage example
searchMusic("neffex fight back", function(results)
    if results and #results > 0 then
        local song = results[1]
        outputChatBox("Playing: " .. song.title)
        playMusic(song.id)
    end
end)
```

## Cache System

- Search results are cached for 5 minutes
- MP3 files are cached for 24 hours (configurable)
- Cache limit of 100 files (configurable)
- Old files are automatically removed

## Project Structure

```
music-api/
├── src/
│   ├── app.js           # Application entry point
│   ├── routes/
│   │   ├── search.js    # Search route
│   │   ├── play.js      # Download/play route
│   │   └── uptime.js    # Health check
│   └── utils/
│       └── download.js  # Download function
├── yt-cookies/
│   └── cookies.txt      # YouTube cookies
├── mp3-cache/           # MP3 files cache
├── .env                 # Configuration
└── package.json
```

## License

MIT
