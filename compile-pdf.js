const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
  console.log('Compiling PDF from resume.html...');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
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
