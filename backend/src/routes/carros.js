import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';

const router = express.Router();

function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || 'autoprime_secret');
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido.' });
  }
}

// Público: listar carros activos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM carros WHERE ativo = TRUE ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter carros.' });
  }
});

// Admin: listar todos os carros (incluindo inactivos)
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carros ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter carros.' });
  }
});

// Admin: adicionar carro
router.post('/', adminAuth, async (req, res) => {
  const { marca, modelo, ano, km, combustivel, preco, imagem, descricao } = req.body;
  if (!marca || !modelo || !preco)
    return res.status(400).json({ error: 'Marca, modelo e preço são obrigatórios.' });
  try {
    const result = await pool.query(
      'INSERT INTO carros (marca, modelo, ano, km, combustivel, preco, imagem, descricao) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [marca, modelo, ano || null, km || null, combustivel, preco, imagem || '', descricao || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar carro.' });
  }
});

// Admin: remover carro (desactivar)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE carros SET ativo = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Carro removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover carro.' });
  }
});

export default router;
