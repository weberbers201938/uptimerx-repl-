const currentUrls = [`https://replit.com/@${process.env.REPL_OWNER}/${process.env.REPL_SLUG}`]; // Add more current URLs as needed
const uptimeUrls = ["https://example.com"]; // Add more uptime URLs as needed

const fs = require('fs');
const path = require('path');
const freeport = require('freeport');
const ProxyChain = require('proxy-chain');
const puppeteer = require('puppeteer');
const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');

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
      const { stdout: chromePath } = await promisify(exec)("which chromium");

      browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath.trim(),
        ignoreHTTPSErrors: true,
        args: [
          '--window-size=375,812',
          '--ignore-certificate-errors',
          '--disable-gpu',
          '--no-sandbox',
          `--proxy-server=127.0.0.1:${proxyPort}`,
        ]
      });

      const cookiesPath = path.join(__dirname, 'cookies.json');
      let cookies = [];
      if (fs.existsSync(cookiesPath)) {
        cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
      }

      // Loop through all uptimeUrls
      for (let i = 0; i < uptimeUrls.length; i++) {
        page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
        );
        if (cookies.length > 0) {
          await page.setCookie(...cookies);
        }
        await page.goto(uptimeUrls[i], { waitUntil: 'networkidle2' });

        const uptimeScreenshotPath = path.join(screenshotDir, `uptime_${i + 1}.jpg`);
        await page.screenshot({ path: uptimeScreenshotPath, type: 'jpeg' });

        console.log(`Screenshot of uptimeUrl ${i + 1} saved to ${uptimeScreenshotPath}`);
      }

      // Loop through all currentUrls
      for (let j = 0; j < currentUrls.length; j++) {
        const newTab = await browser.newPage();
        await newTab.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
        );
        if (cookies.length > 0) {
          await newTab.setCookie(...cookies);
        }
        await newTab.goto(currentUrls[j], { waitUntil: 'networkidle2' });

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

run().catch((error) => {
  console.error('Error during execution:', error);
});
