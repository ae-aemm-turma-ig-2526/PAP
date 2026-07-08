import 'dotenv/config';
import pkg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pkg;
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'autoprime',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS carros (
    id SERIAL PRIMARY KEY,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    ano INTEGER,
    km INTEGER,
    combustivel VARCHAR(50),
    preco DECIMAL(10,2),
    imagem TEXT DEFAULT '',
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS compras (
    id SERIAL PRIMARY KEY,
    carro_id INTEGER REFERENCES carros(id) ON DELETE SET NULL,
    carro_info TEXT,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(50),
    mensagem TEXT,
    estado VARCHAR(50) DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
  )
`);

// Seed carros se a tabela estiver vazia
const { rows } = await pool.query('SELECT COUNT(*) FROM carros');
if (parseInt(rows[0].count) === 0) {
  const carros = [
    ['BMW',      'Série 3',  2021, 150000, 'Gasolina', 25000, '', 'Excelente estado geral.'],
    ['Audi',     'A4',       2020, 130000, 'Diesel',   23500, '', 'Revisões em dia.'],
    ['Mercedes', 'Classe C', 2019, 110000, 'Gasolina', 28000, '', 'Interior impecável.'],
    ['Toyota',   'Corolla',  2022,  50000, 'Híbrido',  22500, '', 'Muito económico.'],
    ['Honda',    'Civic',    2021,  60000, 'Gasolina', 21000, '', 'Primeiro dono.'],
  ];
  for (const c of carros) {
    await pool.query(
      'INSERT INTO carros (marca, modelo, ano, km, combustivel, preco, imagem, descricao) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      c
    );
  }
  console.log('✅ Carros seed inseridos.');
}

// Criar admin se não existir
const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'autoprime2025';
const existing = await pool.query('SELECT id FROM admins WHERE username = $1', [username]);
if (existing.rows.length === 0) {
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [username, hash]);
  console.log(`✅ Admin criado: ${username}`);
} else {
  console.log(`ℹ️  Admin '${username}' já existe.`);
}

await pool.end();
console.log('Setup concluído!');
