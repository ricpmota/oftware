const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const bannersDir = path.join(publicDir, 'banners');

// Criar pasta banners se não existir
if (!fs.existsSync(bannersDir)) {
  fs.mkdirSync(bannersDir, { recursive: true });
  console.log('✓ Pasta public/banners criada');
}

// Mover arquivos Banner*.jpg para public/banners/
const files = fs.readdirSync(publicDir).filter(file => 
  file.startsWith('Banner') && file.endsWith('.jpg')
);

files.forEach(file => {
  const sourcePath = path.join(publicDir, file);
  const destPath = path.join(bannersDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✓ Copiado: ${file} → banners/${file}`);
    
    // Opcional: remover o arquivo original (descomente se quiser)
    // fs.unlinkSync(sourcePath);
    // console.log(`  Removido arquivo original: ${file}`);
  }
});

console.log('\n✓ Arquivos organizados! Agora use a URL: /banners/Banner1.jpg');
