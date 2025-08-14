#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Iniciando build otimizado...');

// Limpar diretórios de build anteriores
const dirsToClean = ['.next', 'out', 'dist'];
dirsToClean.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Limpando diretório ${dir}...`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Configurar variáveis de ambiente para otimização
process.env.NODE_ENV = 'production';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NEXT_SHARP_PATH = './node_modules/sharp';

try {
  // Build otimizado
  console.log('Executando build...');
  execSync('next build', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Exportar para produção (opcional)
  if (process.argv.includes('--export')) {
    console.log('Exportando para produção...');
    execSync('next export', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
  }

  // Análise de bundle (opcional)
  if (process.argv.includes('--analyze')) {
    console.log('Analisando bundle...');
    execSync('ANALYZE=true next build', { 
      stdio: 'inherit',
      env: { ...process.env, ANALYZE: 'true' }
    });
  }

  console.log('Build otimizado concluído com sucesso!');
  
  // Mostrar estatísticas do build
  const nextDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(nextDir)) {
    const stats = fs.statSync(nextDir);
    console.log(`Tamanho do build: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }

} catch (error) {
  console.error('Erro durante o build:', error.message);
  process.exit(1);
} 