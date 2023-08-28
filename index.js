const axios = require('axios');
const fs = require('fs');
const path = require('path');

const dataFilePath = 'data.json';
const logFilePath = 'downloaded.log';

const downloadMedia = async (mxcUrl, fileName) => {
  const maxRetries = 5;
  const retryDelay = 5000; // in milliseconds

  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      const parsedMxcUrl = mxcUrl.match(/^mxc:\/\/([^/]+)\/([^/]+)$/);
      if (!parsedMxcUrl) {
        throw new Error('Invalid mxc URL');
      }

      const [, serverName, mediaId] = parsedMxcUrl;
      const downloadUrl = `https://matrix-client.matrix.org/_matrix/media/v3/download/${serverName}/${mediaId}`;

      const response = await axios.get(downloadUrl, { responseType: 'stream' });

      const downloadDir = path.join(__dirname, 'downloads');
      fs.mkdirSync(downloadDir, { recursive: true });

      const downloadPath = path.join(downloadDir, fileName);

      if (fs.existsSync(downloadPath)) {
        console.log(`Skipping existing file: ${fileName}`);
        return mxcUrl; // Return the MXC URL if file already exists
      }

      const writer = fs.createWriteStream(downloadPath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`Downloaded media for ${fileName}`);

      // Append to the log file
      fs.appendFileSync(logFilePath, mxcUrl + '\n', 'utf8');
      return mxcUrl; // Return the MXC URL after successful download
    } catch (error) {
      if (error.response && error.response.status === 429) {
        // Rate limit error
        console.warn(`Rate limit hit. Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('Error downloading media:', error.message);
        break; // Exit the loop on non-rate-limit errors
      }
    }
  }

  console.error(`Failed to download media after ${maxRetries} retries.`);
};

const parseAndDownloadMedia = async () => {
  try {
    const rawData = fs.readFileSync(dataFilePath);
    const jsonData = JSON.parse(rawData);

    if (!jsonData || !jsonData.messages || !Array.isArray(jsonData.messages)) {
      throw new Error('Invalid JSON data format');
    }

    const mediaMessages = jsonData.messages.filter(message => {
      const content = message.content;
      return content && content.msgtype === 'm.video' && content.url && content.body;
    });

    const downloadedUrls = new Set(
      fs.existsSync(logFilePath) ? fs.readFileSync(logFilePath, 'utf8').split('\n').filter(Boolean) : []
    );

    for (const mediaMessage of mediaMessages) {
      const content = mediaMessage.content;
      const body = content.body;
      const url = content.url;

      if (!downloadedUrls.has(url)) {
        await downloadMedia(url, body);
      } else {
        console.log(`Skipping already downloaded URL: ${url}`);
      }
    }
  } catch (error) {
    console.error('Error parsing JSON:', error.message);
  }
};

parseAndDownloadMedia();
