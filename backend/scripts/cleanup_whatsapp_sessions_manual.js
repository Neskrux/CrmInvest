#!/usr/bin/env node

/**
 * Script de Limpeza Manual das Sessões do WhatsApp Web
 * 
 * Este script remove completamente todas as sessões e cache do WhatsApp Web
 * para garantir que uma nova conexão sempre gere um QR Code limpo.
 * 
 * Uso: node cleanup_whatsapp_sessions_manual.js
 */

const fs = require('fs').promises;
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function cleanupDirectory(dirPath, description) {
  try {
    const stats = await fs.stat(dirPath);
    if (stats.isDirectory()) {
      await fs.rm(dirPath, { recursive: true, force: true });
      log(`✅ ${description} removida com sucesso`, 'green');
      return true;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      log(`ℹ️  ${description} não encontrada (já limpa)`, 'blue');
    } else {
      log(`⚠️  Erro ao remover ${description}: ${error.message}`, 'yellow');
    }
    return false;
  }
}

async function getDirectorySize(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    if (stats.isDirectory()) {
      let totalSize = 0;
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          totalSize += await getDirectorySize(filePath);
        } else {
          const fileStats = await fs.stat(filePath);
          totalSize += fileStats.size;
        }
      }
      return totalSize;
    }
  } catch (error) {
    return 0;
  }
  return 0;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  log('🧹 Iniciando limpeza manual das sessões do WhatsApp Web...', 'cyan');
  log('', 'reset');
  
  const baseDir = __dirname;
  const projectRoot = path.join(baseDir, '..');
  
  // Diretórios para limpeza
  const directoriesToClean = [
    {
      path: path.join(projectRoot, '.wwebjs_auth'),
      description: 'Pasta de autenticação (.wwebjs_auth)'
    },
    {
      path: path.join(projectRoot, '.wwebjs_cache'),
      description: 'Pasta de cache (.wwebjs_cache)'
    },
    {
      path: '/tmp/.wwebjs_auth',
      description: 'Pasta de autenticação de produção (/tmp/.wwebjs_auth)'
    },
    {
      path: path.join(projectRoot, '.wwebjs_auth', 'session-crm-whatsapp'),
      description: 'Sessão específica do cliente (session-crm-whatsapp)'
    }
  ];
  
  let totalSizeBefore = 0;
  let totalSizeAfter = 0;
  let cleanedCount = 0;
  
  // Calcular tamanho antes da limpeza
  log('📊 Calculando tamanho das pastas antes da limpeza...', 'blue');
  for (const dir of directoriesToClean) {
    const size = await getDirectorySize(dir.path);
    totalSizeBefore += size;
    if (size > 0) {
      log(`   ${dir.description}: ${formatBytes(size)}`, 'yellow');
    }
  }
  
  log(`\n📈 Tamanho total antes da limpeza: ${formatBytes(totalSizeBefore)}`, 'magenta');
  log('', 'reset');
  
  // Executar limpeza
  log('🗑️  Executando limpeza...', 'cyan');
  for (const dir of directoriesToClean) {
    const cleaned = await cleanupDirectory(dir.path, dir.description);
    if (cleaned) {
      cleanedCount++;
    }
  }
  
  // Calcular tamanho após limpeza
  log('\n📊 Verificando resultado da limpeza...', 'blue');
  for (const dir of directoriesToClean) {
    const size = await getDirectorySize(dir.path);
    totalSizeAfter += size;
  }
  
  const spaceFreed = totalSizeBefore - totalSizeAfter;
  
  // Resultado final
  log('\n' + '='.repeat(60), 'cyan');
  log('📋 RESUMO DA LIMPEZA', 'bright');
  log('='.repeat(60), 'cyan');
  log(`📁 Pastas processadas: ${directoriesToClean.length}`, 'blue');
  log(`✅ Pastas limpas: ${cleanedCount}`, 'green');
  log(`📊 Tamanho antes: ${formatBytes(totalSizeBefore)}`, 'yellow');
  log(`📊 Tamanho depois: ${formatBytes(totalSizeAfter)}`, 'yellow');
  log(`💾 Espaço liberado: ${formatBytes(spaceFreed)}`, 'green');
  log('', 'reset');
  
  if (cleanedCount > 0) {
    log('🎉 Limpeza concluída com sucesso!', 'green');
    log('💡 Agora você pode conectar o WhatsApp e um novo QR Code será gerado.', 'blue');
  } else {
    log('ℹ️  Nenhuma pasta foi limpa (já estavam vazias).', 'blue');
  }
  
  log('\n🔧 Para evitar que essas pastas sejam commitadas no futuro,', 'cyan');
  log('   certifique-se de que estão no arquivo .gitignore:', 'cyan');
  log('   - .wwebjs_auth/', 'yellow');
  log('   - .wwebjs_cache/', 'yellow');
  log('', 'reset');
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    log(`❌ Erro durante a limpeza: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main, cleanupDirectory, getDirectorySize };
