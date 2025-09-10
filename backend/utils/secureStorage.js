const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { validateFile, generateSecureFilename, getDestinationFolder } = require('./fileValidator');

/**
 * Sistema de armazenamento seguro de arquivos
 * Implementa isolamento, validação e limpeza automática
 */

class SecureStorage {
  constructor() {
    this.basePath = path.join(__dirname, '..', 'uploads');
    this.maxFilesPerFolder = 1000; // Limite de arquivos por pasta
    this.cleanupInterval = 24 * 60 * 60 * 1000; // 24 horas
    this.maxFileAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
    
    this.initializeStorage();
    this.startCleanupScheduler();
  }

  /**
   * Inicializa a estrutura de diretórios
   */
  async initializeStorage() {
    const folders = ['images', 'videos', 'audio', 'documents', 'temp'];
    
    for (const folder of folders) {
      const folderPath = path.join(this.basePath, folder);
      try {
        await fs.mkdir(folderPath, { recursive: true });
        
        // Criar arquivo .gitkeep para manter a pasta no git
        const gitkeepPath = path.join(folderPath, '.gitkeep');
        try {
          await fs.access(gitkeepPath);
        } catch {
          await fs.writeFile(gitkeepPath, '');
        }
      } catch (error) {
        console.error(`Erro ao criar diretório ${folder}:`, error);
      }
    }
  }

  /**
   * Salva um arquivo de forma segura
   */
  async saveFile(file, options = {}) {
    try {
      // 1. Validar arquivo
      const validation = validateFile(file);
      if (!validation.isValid) {
        throw new Error(`Arquivo inválido: ${validation.errors.join(', ')}`);
      }

      // 2. Gerar caminho seguro
      const secureFilename = validation.secureFilename;
      const destinationFolder = validation.destinationFolder;
      const filePath = path.join(this.basePath, destinationFolder, secureFilename);

      // 3. Verificar se arquivo já existe
      try {
        await fs.access(filePath);
        throw new Error('Arquivo com este nome já existe');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // 4. Salvar arquivo
      await fs.writeFile(filePath, file.buffer);

      // 5. Verificar integridade do arquivo salvo
      const savedBuffer = await fs.readFile(filePath);
      if (!savedBuffer.equals(file.buffer)) {
        await fs.unlink(filePath); // Remover arquivo corrompido
        throw new Error('Falha na verificação de integridade do arquivo');
      }

      // 6. Criar metadados
      const metadata = {
        originalName: file.originalname,
        secureFilename: secureFilename,
        mimeType: file.mimetype,
        size: file.size,
        destinationFolder: destinationFolder,
        uploadedAt: new Date().toISOString(),
        checksum: crypto.createHash('sha256').update(file.buffer).digest('hex'),
        url: `/uploads/${destinationFolder}/${secureFilename}`
      };

      // 7. Salvar metadados
      await this.saveMetadata(metadata);

      return {
        success: true,
        filename: secureFilename,
        path: filePath,
        url: metadata.url,
        metadata: metadata
      };

    } catch (error) {
      console.error('Erro ao salvar arquivo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Salva metadados do arquivo
   */
  async saveMetadata(metadata) {
    const metadataPath = path.join(this.basePath, 'metadata.json');
    
    try {
      let existingMetadata = [];
      try {
        const data = await fs.readFile(metadataPath, 'utf8');
        existingMetadata = JSON.parse(data);
      } catch (error) {
        // Arquivo não existe, criar novo
      }

      existingMetadata.push(metadata);
      
      // Manter apenas os últimos 10000 registros
      if (existingMetadata.length > 10000) {
        existingMetadata = existingMetadata.slice(-10000);
      }

      await fs.writeFile(metadataPath, JSON.stringify(existingMetadata, null, 2));
    } catch (error) {
      console.error('Erro ao salvar metadados:', error);
    }
  }

  /**
   * Remove um arquivo de forma segura
   */
  async deleteFile(filename, folder) {
    try {
      const filePath = path.join(this.basePath, folder, filename);
      
      // Verificar se arquivo existe
      await fs.access(filePath);
      
      // Remover arquivo
      await fs.unlink(filePath);
      
      // Remover metadados
      await this.removeMetadata(filename);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove metadados do arquivo
   */
  async removeMetadata(filename) {
    const metadataPath = path.join(this.basePath, 'metadata.json');
    
    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      let metadata = JSON.parse(data);
      
      metadata = metadata.filter(item => item.secureFilename !== filename);
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Erro ao remover metadados:', error);
    }
  }

  /**
   * Verifica se um arquivo existe
   */
  async fileExists(filename, folder) {
    try {
      const filePath = path.join(this.basePath, folder, filename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém informações de um arquivo
   */
  async getFileInfo(filename, folder) {
    try {
      const filePath = path.join(this.basePath, folder, filename);
      const stats = await fs.stat(filePath);
      
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: filePath
      };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }

  /**
   * Limpeza automática de arquivos antigos
   */
  async cleanupOldFiles() {
    try {
      const metadataPath = path.join(this.basePath, 'metadata.json');
      const data = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(data);
      
      const cutoffDate = new Date(Date.now() - this.maxFileAge);
      const filesToDelete = metadata.filter(item => 
        new Date(item.uploadedAt) < cutoffDate
      );

      for (const file of filesToDelete) {
        await this.deleteFile(file.secureFilename, file.destinationFolder);
      }

      console.log(`🧹 Limpeza automática: ${filesToDelete.length} arquivos removidos`);
    } catch (error) {
      console.error('Erro na limpeza automática:', error);
    }
  }

  /**
   * Inicia o agendador de limpeza
   */
  startCleanupScheduler() {
    setInterval(() => {
      this.cleanupOldFiles();
    }, this.cleanupInterval);
  }

  /**
   * Obtém estatísticas de armazenamento
   */
  async getStorageStats() {
    try {
      const folders = ['images', 'videos', 'audio', 'documents'];
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byFolder: {}
      };

      for (const folder of folders) {
        const folderPath = path.join(this.basePath, folder);
        const files = await fs.readdir(folderPath);
        const folderFiles = files.filter(file => file !== '.gitkeep');
        
        let folderSize = 0;
        for (const file of folderFiles) {
          const filePath = path.join(folderPath, file);
          const fileStats = await fs.stat(filePath);
          folderSize += fileStats.size;
        }

        stats.byFolder[folder] = {
          files: folderFiles.length,
          size: folderSize
        };
        
        stats.totalFiles += folderFiles.length;
        stats.totalSize += folderSize;
      }

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }
}

module.exports = SecureStorage;
