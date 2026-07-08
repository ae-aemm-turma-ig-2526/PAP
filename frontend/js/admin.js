const API = '/api';
let token = localStorage.getItem('autoprime_token') || '';

// ── Auth ─────────────────────────────────────────────────────────────────────

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function mostrarDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  carregarCompras();
  carregarCarrosAdmin();
}

function mostrarLogin() {
  token = '';
  localStorage.removeItem('autoprime_token');
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-screen').style.display = 'block';
}

if (token) mostrarDashboard();

document.getElementById('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'A entrar…';
  const msgEl = document.getElementById('msg-login');

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('login-user').value.trim(),
        password: document.getElementById('login-pass').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciais inválidas.');
    token = data.token;
    localStorage.setItem('autoprime_token', token);
    mostrarDashboard();
  } catch (err) {
    msgEl.innerHTML = `<div class="msg error">❌ ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

document.getElementById('btn-logout').addEventListener('click', mostrarLogin);

// ── Tabs ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.admin-nav a[data-tab]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.admin-nav a[data-tab]').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    document.getElementById(`tab-${a.dataset.tab}`).classList.add('active');
  });
});

// ── Compras ──────────────────────────────────────────────────────────────────

async function carregarCompras() {
  const tbody = document.getElementById('compras-tbody');
  try {
    const res = await fetch(`${API}/compras`, { headers: authHeaders() });
    if (res.status === 401) { mostrarLogin(); return; }
    const compras = await res.json();

    // Estatísticas
    const counts = { pendente: 0, contactado: 0, concluido: 0, cancelado: 0 };
    compras.forEach(c => { if (counts[c.estado] !== undefined) counts[c.estado]++; });
    document.getElementById('compras-stats').innerHTML = `
      <div class="stat-card"><div class="num">${compras.length}</div><div class="lbl">Total</div></div>
      <div class="stat-card"><div class="num">${counts.pendente}</div><div class="lbl">Pendentes</div></div>
      <div class="stat-card"><div class="num">${counts.contactado}</div><div class="lbl">Contactados</div></div>
      <div class="stat-card"><div class="num">${counts.concluido}</div><div class="lbl">Concluídos</div></div>
      <div class="stat-card"><div class="num">${counts.cancelado}</div><div class="lbl">Cancelados</div></div>
    `;

    if (compras.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);padding:30px">Sem pedidos ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = compras.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${esc(c.carro_info || (c.marca ? `${c.marca} ${c.modelo}` : '—'))}</td>
        <td>${esc(c.nome)}</td>
        <td><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></td>
        <td>${esc(c.telefone || '—')}</td>
        <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
            title="${esc(c.mensagem || '')}">${esc(c.mensagem || '—')}</td>
        <td>${new Date(c.created_at).toLocaleDateString('pt-PT')}</td>
        <td>
          <select class="estado-sel" data-id="${c.id}" onchange="atualizarEstado(this)">
            ${['pendente','contactado','concluido','cancelado'].map(s =>
              `<option value="${s}" ${c.estado === s ? 'selected' : ''}>${
                {pendente:'Pendente',contactado:'Contactado',concluido:'Concluído',cancelado:'Cancelado'}[s]
              }</option>`
            ).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="8" style="color:red;padding:20px">Erro ao carregar pedidos.</td></tr>';
  }
}

async function atualizarEstado(sel) {
  const id = sel.dataset.id;
  const estado = sel.value;
  try {
    const res = await fetch(`${API}/compras/${id}/estado`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) throw new Error();
    mostrarMsg('msg-compras', 'Estado atualizado.', 'success');
  } catch {
    mostrarMsg('msg-compras', 'Erro ao atualizar estado.', 'error');
    carregarCompras();
  }
}

// ── Carros Admin ─────────────────────────────────────────────────────────────

async function carregarCarrosAdmin() {
  const tbody = document.getElementById('carros-tbody');
  try {
    const res = await fetch(`${API}/carros/admin`, { headers: authHeaders() });
    if (res.status === 401) { mostrarLogin(); return; }
    const carros = await res.json();

    if (carros.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);padding:30px">Sem carros.</td></tr>';
      return;
    }

    tbody.innerHTML = carros.map(c => `
      <tr style="${c.ativo ? '' : 'opacity:0.45'}">
        <td>
          ${c.imagem
            ? `<img src="${c.imagem}" style="width:60px;height:44px;object-fit:cover;border-radius:6px" />`
            : '<span style="font-size:1.5rem">🚗</span>'}
        </td>
        <td><strong>${esc(c.marca)}</strong> ${esc(c.modelo)}</td>
        <td>${c.ano || '—'}</td>
        <td>${c.km ? Number(c.km).toLocaleString('pt-PT') + ' km' : '—'}</td>
        <td>${esc(c.combustivel || '—')}</td>
        <td>${Number(c.preco).toLocaleString('pt-PT', {style:'currency',currency:'EUR'})}</td>
        <td><span class="badge ${c.ativo ? 'concluido' : 'cancelado'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          ${c.ativo
            ? `<button class="btn btn-sm btn-danger" onclick="removerCarro(${c.id})">Remover</button>`
            : '<span style="color:var(--gray);font-size:0.85rem">Removido</span>'}
        </td>
      </tr>
    `).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="8" style="color:red;padding:20px">Erro ao carregar carros.</td></tr>';
  }
}

async function removerCarro(id) {
  if (!confirm('Remover este carro do catálogo?')) return;
  try {
    const res = await fetch(`${API}/carros/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error();
    mostrarMsg('msg-add-carro', 'Carro removido do catálogo.', 'success');
    carregarCarrosAdmin();
  } catch {
    mostrarMsg('msg-add-carro', 'Erro ao remover carro.', 'error');
  }
}

// Preview de imagem
document.getElementById('c-imagem').addEventListener('change', e => {
  const file = e.target.files[0];
  const preview = document.getElementById('c-imagem-preview');
  if (!file) { preview.style.display = 'none'; return; }
  const reader = new FileReader();
  reader.onload = ev => { preview.src = ev.target.result; preview.style.display = 'block'; };
  reader.readAsDataURL(file);
});

document.getElementById('form-add-carro').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'A guardar…';

  const imgFile = document.getElementById('c-imagem').files[0];
  let imagem = '';
  if (imgFile) {
    imagem = await new Promise(resolve => {
      const r = new FileReader();
      r.onload = ev => resolve(ev.target.result);
      r.readAsDataURL(imgFile);
    });
  }

  const payload = {
    marca:      document.getElementById('c-marca').value.trim(),
    modelo:     document.getElementById('c-modelo').value.trim(),
    ano:        document.getElementById('c-ano').value || null,
    km:         document.getElementById('c-km').value || null,
    combustivel:document.getElementById('c-combustivel').value || null,
    preco:      document.getElementById('c-preco').value,
    imagem,
    descricao:  document.getElementById('c-descricao').value.trim(),
  };

  try {
    const res = await fetch(`${API}/carros`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao adicionar.');
    mostrarMsg('msg-add-carro', `Carro "${data.marca} ${data.modelo}" adicionado!`, 'success');
    e.target.reset();
    document.getElementById('c-imagem-preview').style.display = 'none';
    carregarCarrosAdmin();
  } catch (err) {
    mostrarMsg('msg-add-carro', `❌ ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Adicionar Carro';
  }
});

// ── Utilitários ───────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function mostrarMsg(elId, texto, tipo) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = `<div class="msg ${tipo}">${texto}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 4000);
}
