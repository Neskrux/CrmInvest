const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Abrir conexão com o banco
const db = new sqlite3.Database(path.join(__dirname, '..', 'database.sqlite'));

// Ler o arquivo de migration
const migration = fs.readFileSync(
  path.join(__dirname, '..', 'migrations', '008_add_clinic_documents.sql'),
  'utf8'
);

// Executar cada comando SQL separadamente
const commands = migration
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0);

let completed = 0;

function runNextCommand() {
  if (completed >= commands.length) {
    console.log('✅ Migration 008_add_clinic_documents executada com sucesso!');
    db.close();
    return;
  }

  const command = commands[completed];
  
  db.run(command + ';', function(err) {
    if (err) {
      console.error(`❌ Erro ao executar comando ${completed + 1}:`, err.message);
      console.error('Comando:', command.substring(0, 100) + '...');
      db.close();
      process.exit(1);
    } else {
      console.log(`✓ Comando ${completed + 1} executado`);
      completed++;
      runNextCommand();
    }
  });
}

console.log('🚀 Executando migration 008_add_clinic_documents...');
runNextCommand();
