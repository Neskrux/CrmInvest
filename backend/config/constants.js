const JWT_SECRET = 'nKDiWQtS50GAaJUf3u2YKPxrJn+Y2DRdV5pRwkUg0iBkb/tvH0UQVAnOT8kWQA7pp27mXaTCaoV2NpoOPVZ8IA==';

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.FRONTEND_URL,
    /\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = {
  JWT_SECRET,
  corsOptions
};
