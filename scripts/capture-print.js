const fs = require('node:fs/promises');
const path = require('node:path');
const screenshot = require('screenshot-desktop');

async function capturePrint() {
  const tmpDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
  const outputPath = path.join(tmpDir, 'print.jpg');
  const imageBuffer = await screenshot({ format: 'jpg' });
  await fs.writeFile(outputPath, imageBuffer);
  return outputPath;
}

if (require.main === module) {
  capturePrint()
    .then((outputPath) => {
      process.stdout.write(outputPath);
    })
    .catch((error) => {
      console.error('Erro ao capturar screenshot:', error);
      process.exit(1);
    });
}

module.exports = { capturePrint };
