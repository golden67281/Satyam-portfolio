const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('Compiling PDF from resume.html...');
  
  const options = {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  
  // Local system browser paths fallback for Windows
  const winChromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  
  for (const p of winChromePaths) {
    if (fs.existsSync(p)) {
      options.executablePath = p;
      console.log('Using system browser:', p);
      break;
    }
  }

  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, 'resume.html');
  await page.goto('file://' + filePath, { waitUntil: 'networkidle0' });
  
  // Render PDF using exact A4 format and margins matching the original resume
  await page.pdf({
    path: 'SATYAM SHARMA.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '15mm',
      right: '15mm'
    }
  });

  await browser.close();
  console.log('Successfully generated SATYAM SHARMA.pdf!');
}

run().catch(console.error);
