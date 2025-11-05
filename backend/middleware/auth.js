const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware especial para upload que preserva headers
const authenticateUpload = (req, res, next) => {
  // Para upload com FormData, o header pode vir em minúsculas ou maiúsculas
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ JWT verify error:', err.message);
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Middleware para verificar se é admin ou consultor interno
const requireAdminOrConsultorInterno = (req, res, next) => {
  const isConsultorInterno = req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true;
  const isAdmin = req.user.tipo === 'admin' || req.user.tipo === 'root';
  
  if (!isAdmin && !isConsultorInterno) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou consultores internos.' });
  }
  next();
};

// Middleware para verificar se é admin ou parceiro
const requireAdminOrEmpresa = (req, res, next) => {
  if (req.user.tipo !== 'admin' && req.user.tipo !== 'parceiro') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou parceiros.' });
  }
  next();
};

// Middleware para verificar se é o próprio consultor ou admin
const requireOwnerOrAdmin = (req, res, next) => {
  const consultorId = req.params.consultorId || req.query.consultor_id || req.body.consultor_id;
  
  if (req.user.tipo === 'admin') {
    return next(); // Admin pode tudo
  }
  
  if (req.user.tipo === 'consultor' && req.user.id === parseInt(consultorId)) {
    return next(); // Consultor pode acessar seus próprios dados
  }
  
  return res.status(403).json({ error: 'Acesso negado' });
};

module.exports = {
  authenticateToken,
  authenticateUpload,
  requireAdmin,
  requireAdminOrConsultorInterno,
  requireAdminOrEmpresa,
  requireOwnerOrAdmin
};

