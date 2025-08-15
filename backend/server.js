const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { corsOptions } = require('./config/constants');
const { initializeTables } = require('./config/database');

const authRoutes = require('./routes/auth');
const clinicasRoutes = require('./routes/clinicas');
const consultoresRoutes = require('./routes/consultores');
const pacientesRoutes = require('./routes/pacientes');
const agendamentosRoutes = require('./routes/agendamentos');
const fechamentosRoutes = require('./routes/fechamentos');
const metaadsRoutes = require('./routes/metaads');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', authRoutes);
app.use('/api/clinicas', clinicasRoutes);
app.use('/api/consultores', consultoresRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/fechamentos', fechamentosRoutes);
app.use('/api/meta-ads', metaadsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, async () => {
  try {
    const { supabase } = require('./config/database');
    const { data, error } = await supabase.from('clinicas').select('count').limit(1);
  } catch (error) {
  }
  
  await initializeTables();
}); 

