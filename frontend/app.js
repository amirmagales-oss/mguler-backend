const state = {
  apiBase: localStorage.getItem('apiBase') || 'http://localhost:3000',
  token: localStorage.getItem('token') || '',
  activeView: 'dashboard'
};

const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];

qs('#apiBase').value = state.apiBase;

function setMessage(message, isError = false) {
  const el = qs('#loginMessage');
  el.textContent = message || '';
  el.style.color = isError ? '#fca5a5' : '#94a3b8';
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${state.apiBase}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API hatası');
  return data;
}

function showView(name) {
  state.activeView = name;
  qsa('.view').forEach((el) => el.classList.add('hidden'));
  qs(`#view-${name}`).classList.remove('hidden');
  qsa('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === name));
}

async function renderDashboard() {
  const data = await api('/api/reports/dashboard');
  const { cards, latestMovements, criticalList, warehouseSummary } = data.dashboard;
  qs('#view-dashboard').innerHTML = `
    <div class="grid four">
      <div class="metric"><small>Toplam Ürün</small><strong>${cards.productsCount}</strong></div>
      <div class="metric"><small>Toplam Depo</small><strong>${cards.warehousesCount}</strong></div>
      <div class="metric"><small>Kritik Stok</small><strong>${cards.criticalCount}</strong></div>
      <div class="metric"><small>Bugünkü Hareket</small><strong>${cards.todayMovements}</strong></div>
    </div>
    <div class="card">
      <div class="section-head"><h3>Depo Özeti</h3></div>
      <div class="table-wrap"><table><thead><tr><th>Depo</th><th>Miktar</th></tr></thead><tbody>
      ${warehouseSummary.map(x => `<tr><td>${x.name}</td><td>${x.quantity}</td></tr>`).join('') || '<tr><td colspan="2">Kayıt yok</td></tr>'}
      </tbody></table></div>
    </div>
    <div class="grid two">
      <div class="card">
        <div class="section-head"><h3>Son Hareketler</h3></div>
        <div class="table-wrap"><table><thead><tr><th>No</th><th>Tip</th><th>Ürün</th><th>Miktar</th></tr></thead><tbody>
        ${latestMovements.map(m => `<tr><td>${m.movementNo}</td><td>${m.movementType}</td><td>${m.product.name}</td><td>${m.quantity}</td></tr>`).join('') || '<tr><td colspan="4">Kayıt yok</td></tr>'}
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="section-head"><h3>Kritik Stok Listesi</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Ürün</th><th>Depo</th><th>Miktar</th></tr></thead><tbody>
        ${criticalList.map(i => `<tr><td>${i.product.name}</td><td>${i.warehouse.name}</td><td><span class="badge warn">${i.quantity}</span></td></tr>`).join('') || '<tr><td colspan="3">Kritik ürün yok</td></tr>'}
        </tbody></table></div>
      </div>
    </div>`;
}

async function renderProducts() {
  const data = await api('/api/products');
  qs('#view-products').innerHTML = `
    <div class="card">
      <div class="section-head"><h3>Ürünler</h3><span class="badge ok">${data.products.length} kayıt</span></div>
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th>Ürün</th><th>Marka</th><th>Kategori</th><th>Toplam Stok</th><th>Durum</th></tr></thead><tbody>
      ${data.products.map(p => `<tr><td>${p.sku}</td><td>${p.name}</td><td>${p.brand || '-'}</td><td>${p.category || '-'}</td><td>${p.totalStock}</td><td>${p.isCritical ? '<span class="badge warn">Kritik</span>' : '<span class="badge ok">Normal</span>'}</td></tr>`).join('') || '<tr><td colspan="6">Kayıt yok</td></tr>'}
      </tbody></table></div>
    </div>`;
}

async function renderWarehouses() {
  const data = await api('/api/warehouses');
  qs('#view-warehouses').innerHTML = `
    <div class="card">
      <div class="section-head"><h3>Depolar</h3><span class="badge ok">${data.warehouses.length} kayıt</span></div>
      <div class="table-wrap"><table><thead><tr><th>Kod</th><th>Ad</th><th>Ürün Çeşidi</th><th>Toplam Miktar</th><th>Durum</th></tr></thead><tbody>
      ${data.warehouses.map(w => `<tr><td>${w.code}</td><td>${w.name}</td><td>${w.productCount}</td><td>${w.totalQuantity}</td><td>${w.isActive ? '<span class="badge ok">Aktif</span>' : '<span class="badge warn">Pasif</span>'}</td></tr>`).join('') || '<tr><td colspan="5">Kayıt yok</td></tr>'}
      </tbody></table></div>
    </div>`;
}

async function renderStock() {
  const data = await api('/api/stock/current');
  qs('#view-stock').innerHTML = `
    <div class="card">
      <div class="section-head"><h3>Mevcut Stok</h3><span class="badge ok">${data.items.length} kayıt</span></div>
      <div class="table-wrap"><table><thead><tr><th>Ürün</th><th>Depo</th><th>Miktar</th><th>Min. Stok</th><th>Durum</th></tr></thead><tbody>
      ${data.items.map(i => `<tr><td>${i.product.name}</td><td>${i.warehouse.name}</td><td>${i.quantity}</td><td>${i.product.minStockLevel}</td><td>${i.isCritical ? '<span class="badge warn">Kritik</span>' : '<span class="badge ok">Normal</span>'}</td></tr>`).join('') || '<tr><td colspan="5">Kayıt yok</td></tr>'}
      </tbody></table></div>
    </div>`;
}

async function renderMovements() {
  const data = await api('/api/stock/movements');
  qs('#view-movements').innerHTML = `
    <div class="card">
      <div class="section-head"><h3>Stok Hareketleri</h3><span class="badge ok">${data.movements.length} kayıt</span></div>
      <div class="table-wrap"><table><thead><tr><th>No</th><th>Tip</th><th>Ürün</th><th>Kaynak</th><th>Hedef</th><th>Miktar</th><th>Kullanıcı</th></tr></thead><tbody>
      ${data.movements.map(m => `<tr><td>${m.movementNo}</td><td>${m.movementType}</td><td>${m.product.name}</td><td>${m.sourceWarehouse?.name || '-'}</td><td>${m.targetWarehouse?.name || '-'}</td><td>${m.quantity}</td><td>${m.createdBy.username}</td></tr>`).join('') || '<tr><td colspan="7">Kayıt yok</td></tr>'}
      </tbody></table></div>
    </div>`;
}

async function renderLogs() {
  const data = await api('/api/logs');
  qs('#view-logs').innerHTML = `
    <div class="card">
      <div class="section-head"><h3>Sistem Logları</h3><span class="badge ok">${data.logs.length} kayıt</span></div>
      <div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Kullanıcı</th><th>Modül</th><th>İşlem</th><th>Açıklama</th></tr></thead><tbody>
      ${data.logs.map(l => `<tr><td>${new Date(l.createdAt).toLocaleString('tr-TR')}</td><td>${l.user?.username || '-'}</td><td>${l.module}</td><td>${l.actionType}</td><td>${l.description}</td></tr>`).join('') || '<tr><td colspan="5">Kayıt yok</td></tr>'}
      </tbody></table></div>
    </div>`;
}

async function renderActiveView() {
  if (!state.token) return;
  const map = {
    dashboard: renderDashboard,
    products: renderProducts,
    warehouses: renderWarehouses,
    stock: renderStock,
    movements: renderMovements,
    logs: renderLogs
  };
  await map[state.activeView]();
}

async function login() {
  try {
    const username = qs('#username').value.trim();
    const password = qs('#password').value.trim();
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    state.token = data.token;
    localStorage.setItem('token', state.token);
    qs('#loginCard').classList.add('hidden');
    setMessage('');
    await renderActiveView();
  } catch (error) {
    setMessage(error.message, true);
  }
}

function logout() {
  localStorage.removeItem('token');
  state.token = '';
  qs('#loginCard').classList.remove('hidden');
  qsa('.view').forEach(v => v.innerHTML = '');
}

qs('#saveApi').addEventListener('click', () => {
  state.apiBase = qs('#apiBase').value.trim();
  localStorage.setItem('apiBase', state.apiBase);
  setMessage('API adresi kaydedildi.');
});
qs('#loginBtn').addEventListener('click', login);
qs('#logoutBtn').addEventListener('click', logout);
qsa('.nav-btn').forEach(btn => btn.addEventListener('click', async () => { showView(btn.dataset.view); await renderActiveView(); }));

(async function init() {
  showView('dashboard');
  if (state.token) {
    qs('#loginCard').classList.add('hidden');
    try {
      await api('/api/auth/me');
      await renderActiveView();
    } catch {
      logout();
    }
  }
})();
