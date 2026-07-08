const API = '/api';

// ── Navegação ────────────────────────────────────────────────────────────────

function showSection(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav a[data-section]').forEach(a => a.classList.remove('active'));
  const sec = document.getElementById(id);
  if (sec) sec.classList.add('active');
  document.querySelectorAll(`nav a[data-section="${id}"]`).forEach(a => a.classList.add('active'));
  window.scrollTo(0, 0);
}

document.querySelectorAll('nav a[data-section], a[data-section]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    showSection(a.dataset.section);
  });
});

// ── Carros ───────────────────────────────────────────────────────────────────

async function carregarCarros() {
  const grid = document.getElementById('carros-grid');
  try {
    const res = await fetch(`${API}/carros`);
    if (!res.ok) throw new Error('Erro na API');
    const carros = await res.json();

    const statEl = document.getElementById('stat-carros');
    if (statEl) statEl.textContent = carros.length;

    if (carros.length === 0) {
      grid.innerHTML = '<p style="color:var(--gray);grid-column:1/-1">Nenhum carro disponível de momento.</p>';
      return;
    }

    grid.innerHTML = carros.map(c => `
      <div class="carro-card" onclick="abrirModal(${c.id}, '${esc(c.marca)} ${esc(c.modelo)}', ${c.preco})">
        <div class="carro-img">
          ${c.imagem
            ? `<img src="${c.imagem}" alt="${esc(c.marca)} ${esc(c.modelo)}" loading="lazy" />`
            : '🚗'}
        </div>
        <div class="carro-body">
          <div class="carro-marca">${esc(c.marca)}</div>
          <div class="carro-nome">${esc(c.modelo)}</div>
          <div class="carro-detalhes">
            ${c.ano ? `<span>📅 ${c.ano}</span>` : ''}
            ${c.km  ? `<span>📍 ${Number(c.km).toLocaleString('pt-PT')} km</span>` : ''}
            ${c.combustivel ? `<span>⛽ ${esc(c.combustivel)}</span>` : ''}
          </div>
          <div class="carro-preco">${Number(c.preco).toLocaleString('pt-PT', {style:'currency',currency:'EUR'})}</div>
          <button class="btn btn-sm" onclick="event.stopPropagation();abrirModal(${c.id},'${esc(c.marca)} ${esc(c.modelo)}',${c.preco})">
            Pedir Informações
          </button>
        </div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = '<p style="color:var(--gray);grid-column:1/-1">Erro ao carregar carros. Tente novamente.</p>';
  }
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Modal de compra ──────────────────────────────────────────────────────────

function abrirModal(carroId, nome, preco) {
  document.getElementById('compra-carro-id').value = carroId;
  document.getElementById('modal-carro-ref').textContent =
    `${nome} — ${Number(preco).toLocaleString('pt-PT', {style:'currency',currency:'EUR'})}`;
  document.getElementById('msg-compra').innerHTML = '';
  document.getElementById('form-compra').reset();
  document.getElementById('compra-carro-id').value = carroId;
  document.getElementById('modal-compra').classList.add('open');
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-compra').classList.remove('open');
});
document.getElementById('modal-compra').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

document.getElementById('form-compra').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'A enviar…';

  const payload = {
    carro_id: document.getElementById('compra-carro-id').value || null,
    nome:      document.getElementById('compra-nome').value.trim(),
    email:     document.getElementById('compra-email').value.trim(),
    telefone:  document.getElementById('compra-telefone').value.trim(),
    mensagem:  document.getElementById('compra-mensagem').value.trim(),
  };

  const msgEl = document.getElementById('msg-compra');
  try {
    const res = await fetch(`${API}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar pedido.');
    msgEl.innerHTML = `<div class="msg success">✅ ${data.message}</div>`;
    e.target.reset();
    setTimeout(() => document.getElementById('modal-compra').classList.remove('open'), 2500);
  } catch (err) {
    msgEl.innerHTML = `<div class="msg error">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Pedido';
  }
});

// ── Formulário de contacto (sem carro) ───────────────────────────────────────

document.getElementById('form-contacto').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const msgEl = document.getElementById('msg-contacto');
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:     fd.get('nome').trim(),
        email:    fd.get('email').trim(),
        mensagem: fd.get('mensagem').trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar.');
    msgEl.innerHTML = '<div class="msg success">✅ Mensagem enviada! Entraremos em contacto em breve.</div>';
    e.target.reset();
  } catch (err) {
    msgEl.innerHTML = `<div class="msg error">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────

carregarCarros();
