const currentUrls = ["https://replit.com/@aoisaito505/PUPPETEER-UPTIME-OPEN-SOURCE-INDEXJS-ONLY", "https://replit.com/@aoisaito505/apis-ber"];  // Add more current URLs as needed
const uptimeUrls = ["https://db13501b-b6b5-4e32-8de6-3fb7add35d3c-00-3sovxdzzjrt0t.pike.replit.dev/", "https://0f7723e0-abf0-46c4-9c17-a40a166dc99c-00-20552yypoemja.sisko.replit.dev/"];  // Add more uptime URLs as needed

const fs = require('fs');
const path = require('path');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer-core');
const { exec } = require('node:child_process');
const { promisify } = require('node:util');
const express = require('express');

const app = express();
const port = 3000;
const screenshotDir = path.join(__dirname, 'screenshots');
const videoDir = path.join(__dirname, 'video.mp4');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}

let browser, page;

async function run() {
  freeport(async (err, proxyPort) => {
    if (err) {
      console.error('Error finding free port:', err);
      return;
    }

    const proxyServer = new ProxyChain.Server({ port: proxyPort });

    proxyServer.listen(async () => {
      const { stdout: chromiumPath } = await promisify(exec)("which chromium");

      browser = await puppeteer.launch({
        headless: false,
        executablePath: chromiumPath.trim(),
        ignoreHTTPSErrors: true,
        args: [
          '--ignore-certificate-errors',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          `--proxy-server=127.0.0.1:${proxyPort}`
        ]
      });

      const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));

      // Loop through all uptimeUrls
      for (let i = 0; i < uptimeUrls.length; i++) {
        page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7;en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17");
        await page.setCookie(...cookies);
        await page.goto(uptimeUrls[i], { waitUntil: 'networkidle2' });

        // Take a screenshot of the uptime page
        const uptimeScreenshotPath = path.join(screenshotDir, `uptime_${i + 1}.jpg`);
        await page.screenshot({ path: uptimeScreenshotPath, type: 'jpeg' });

        console.log(`Screenshot of uptimeUrl ${i + 1} saved to ${uptimeScreenshotPath}`);
      }

      // Loop through all currentUrls
      for (let j = 0; j < currentUrls.length; j++) {
        const newTab = await browser.newPage();
        await newTab.setUserAgent("Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7;en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17");
        await newTab.setCookie(...cookies);
        await newTab.goto(currentUrls[j], { waitUntil: 'networkidle2' });

        // Take a screenshot of the currentUrl page
        const currentScreenshotPath = path.join(screenshotDir, `current_${j + 1}.jpg`);
        await newTab.screenshot({ path: currentScreenshotPath, type: 'jpeg' });

        console.log(`Screenshot of currentUrl ${j + 1} saved to ${currentScreenshotPath}`);
      }

      app.get('/ss', async (req, res) => {
        try {
          res.sendFile(screenshotDir);
        } catch (err) {
          console.error('Error sending screenshot:', err);
          res.status(500).send('Error sending screenshot');
        }
      });

      app.get('/', async (req, res) => {
        try {
          res.sendFile(videoDir);
        } catch (err) {
          console.error('Error:', err);
          res.status(500).send('Error');
        }
      });

      app.listen(port, () => {
        console.log(`Express server listening on port ${port}`);
      });

      console.log('Browser is running. Press Ctrl+C to exit.');
    });
  });
}

run();
