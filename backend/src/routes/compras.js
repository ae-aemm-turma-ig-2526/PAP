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

// Público: submeter pedido de compra
router.post('/', async (req, res) => {
  const { carro_id, nome, email, telefone, mensagem } = req.body;
  if (!nome || !email)
    return res.status(400).json({ error: 'Nome e email são obrigatórios.' });

  try {
    let carro_info = '';
    if (carro_id) {
      const c = await pool.query('SELECT marca, modelo, preco FROM carros WHERE id = $1', [carro_id]);
      if (c.rows[0]) {
        const { marca, modelo, preco } = c.rows[0];
        carro_info = `${marca} ${modelo} — ${parseFloat(preco).toLocaleString('pt-PT')}€`;
      }
    }

    const result = await pool.query(
      'INSERT INTO compras (carro_id, carro_info, nome, email, telefone, mensagem) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [carro_id || null, carro_info, nome, email, telefone || '', mensagem || '']
    );
    res.status(201).json({ message: 'Pedido enviado com sucesso!', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar pedido.' });
  }
});

// Admin: listar todas as compras/vendas
router.get('/', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, ca.marca, ca.modelo
       FROM compras c
       LEFT JOIN carros ca ON c.carro_id = ca.id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter vendas.' });
  }
});

// Admin: atualizar estado da venda
router.put('/:id/estado', adminAuth, async (req, res) => {
  const { estado } = req.body;
  const estados = ['pendente', 'contactado', 'concluido', 'cancelado'];
  if (!estados.includes(estado))
    return res.status(400).json({ error: 'Estado inválido.' });
  try {
    await pool.query('UPDATE compras SET estado = $1 WHERE id = $2', [estado, req.params.id]);
    res.json({ message: 'Estado actualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao actualizar estado.' });
  }
});

export default router;
