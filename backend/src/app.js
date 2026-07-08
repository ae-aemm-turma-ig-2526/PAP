import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import carrosRoutes from './routes/carros.js';
import comprasRoutes from './routes/compras.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/carros', carrosRoutes);
app.use('/api/compras', comprasRoutes);

// Serve frontend
app.use(express.static(join(__dirname, '../../frontend')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AutoPrime a correr na porta ${PORT}`));
