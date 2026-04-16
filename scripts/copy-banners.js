const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'banners');
const destDir = path.join(__dirname, '..', 'public', 'banners');

// Criar pasta de destino se não existir
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log('Pasta public/banners criada');
}

// Copiar arquivos
const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.jpg'));
files.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);
  fs.copyFileSync(sourcePath, destPath);
  console.log(`Copiado: ${file}`);
});

console.log('Banners copiados com sucesso!');
