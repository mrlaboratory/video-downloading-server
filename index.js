const express = require('express');
const app = express();
const router = express.Router();
const cors = require('cors');
const port = process.env.PORT || 4000
const base_url = process.env.BASE_URL || 'http://localhost:3000'

const compression = require('compression');



const ytdl = require('ytdl-core');
const { google } = require('googleapis');
const contentDisposition = require('content-disposition');

const API_KEY = process.env.API_KEY
const youtube = google.youtube({
  version: 'v3',
  auth: API_KEY,
});

// middleware 
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(compression());



// for youtube downloader 
async function searchYouTube(params = {}) {
  const res = await youtube.search.list({
    part: 'snippet',
    type: 'video',
    ...params,
  });
  return res.data;
}

// Get video information (meta-info) from YouTube
app.get('/metainfo', async (req, res) => {
  const { url } = req.query;
  if (!ytdl.validateID(url) && !ytdl.validateURL(url)) {
    return res
      .status(400)
      .json({ success: false, error: 'No valid YouTube Id!' });
  }

  try {
    const result = await ytdl.getInfo(url);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.log('Error fetching video information: ', error);
    return res.status(400).json({ success: false, error });
  }
});

// Download a video with the selected format
app.get('/watch', async (req, res) => {
  const { v: url, format: f = '.mp4' } = req.query;
  if (!ytdl.validateID(url) && !ytdl.validateURL(url)) {
    return res
      .status(400)
      .json({ success: false, error: 'No valid YouTube Id!' });
  }

  const formats = ['.mp4', '.mp3', '.mov', '.flv'];
  let format = f;
  if (!formats.includes(f)) {
    format = '.mp4';
  }

  try {
    const result = await ytdl.getBasicInfo(url);
    const {
      videoDetails: { title, videoId },
    } = result;
    res.setHeader('Content-Disposition', contentDisposition(`${title}${format}`));
    /**
     * Fix this hack
     */
    let filterQuality = 'audioandvideo';
    if (format === '.mp3') {
      filterQuality = 'audioonly';
    }

    ytdl(url, { format, filter: filterQuality }).pipe(res);
  } catch (err) {
    console.log('Error downloading video: ', err);
    res.status(500).json({ success: false, error: 'Error downloading video!' });
  }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
  