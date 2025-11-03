const express = require('express');
const router = express.Router();
const path = require('path');

// Servir imagens estáticas
router.get('/static/logo-im.png', (req, res) => {
  const imagePath = path.join(__dirname, '../../frontend/src/images/logobrasao.png');
  res.sendFile(imagePath);
});

module.exports = router;

