// ============================================================
// admin-dashboard.js
// Logika untuk halaman Dashboard Admin
// Menampilkan statistik, tiket terbaru, dan grafik kategori
// Bergantung pada: utils.js dan auth.js
// ============================================================

// ------------------------------------------------------------
// KONFIGURASI BADGE
// Didefinisikan di sini karena my-tickets.js tidak dimuat
// di halaman ini — setiap file JS berdiri sendiri
// ------------------------------------------------------------

const STATUS_BADGE = {
  'Open':        { cls: 'badge-open',       label: 'Open'        },
  'In Progress': { cls: 'badge-inprogress', label: 'In Progress' },
  'Resolved':    { cls: 'badge-resolved',   label: 'Resolved'    },
  'Closed':      { cls: 'badge-closed',     label: 'Closed'      },
};

const PRIORITY_BADGE = {
  'Low':    { cls: 'badge-low',    label: 'Low'    },
  'Medium': { cls: 'badge-medium', label: 'Medium' },
  'High':   { cls: 'badge-high',   label: 'High'   },
};

// Daftar kategori beserta warna untuk grafik Chart.js
const CATEGORY_CONFIG = [
  { name: 'Hardware', color: '#3b82f6' },
  { name: 'Software', color: '#8b5cf6' },
  { name: 'Network',  color: '#10b981' },
  { name: 'Account',  color: '#f59e0b' },
  { name: 'Other',    color: '#6b7280' },
];

// ------------------------------------------------------------
// UTILITAS LOKAL
// ------------------------------------------------------------

/**
 * Mengubah karakter HTML berbahaya menjadi entitas yang aman.
 * @param   {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ------------------------------------------------------------
// AMBIL DAN HITUNG DATA TIKET
// ------------------------------------------------------------

/**
 * Mengambil semua tiket dari LocalStorage.
 * @returns {Array}
 */
function getAllTickets() {
  return getFromStorage(STORAGE_KEYS.TICKETS, []);
}

/**
 * Menghitung statistik semua tiket berdasarkan status.
 * @param   {Array}  tickets
 * @returns {Object} { total, open, inProgress, resolved, closed }
 */
function calcStats(tickets) {
  return {
    total:      tickets.length,
    open:       tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved:   tickets.filter(t => t.status === 'Resolved').length,
    closed:     tickets.filter(t => t.status === 'Closed').length,
  };
}

/**
 * Menghitung jumlah tiket per kategori.
 * @param   {Array}  tickets
 * @returns {Object} { Hardware: n, Software: n, ... }
 */
function calcCategoryCount(tickets) {
  const counts = {};
  CATEGORY_CONFIG.forEach(c => { counts[c.name] = 0; });
  tickets.forEach(t => {
    if (counts[t.category] !== undefined) {
      counts[t.category]++;
    } else {
      counts['Other'] = (counts['Other'] || 0) + 1;
    }
  });
  return counts;
}

/**
 * Mengambil tiket terbaru (maks 5), diurutkan dari yang paling baru.
 * @param   {Array}  tickets
 * @returns {Array}
 */
function getRecentTickets(tickets) {
  return tickets
    .slice()                                                // Salin agar tidak mutasi array asli
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);                                          // Ambil 5 teratas
}

// ------------------------------------------------------------
// RENDER STAT CARDS
// ------------------------------------------------------------

/**
 * Mengisi 5 stat card dengan angka dari hasil calcStats().
 * @param {Object} stats
 */
function renderAdminStatCards(stats) {
  const map = {
    'admin-stat-total':      stats.total,
    'admin-stat-open':       stats.open,
    'admin-stat-inprogress': stats.inProgress,
    'admin-stat-resolved':   stats.resolved,
    'admin-stat-closed':     stats.closed,
  };
  for (const [id, value] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
}

// ------------------------------------------------------------
// RENDER WELCOME META (angka ringkasan di banner)
// ------------------------------------------------------------

/**
 * Mengisi angka ringkasan di welcome banner admin.
 * @param {Object} stats
 */
function renderWelcomeMeta(stats) {
  const totalEl      = document.getElementById('welcome-total');
  const openEl       = document.getElementById('welcome-open');
  const inProgressEl = document.getElementById('welcome-inprogress');

  if (totalEl)      totalEl.textContent      = stats.total;
  if (openEl)       openEl.textContent       = stats.open;
  if (inProgressEl) inProgressEl.textContent = stats.inProgress;
}

// ------------------------------------------------------------
// RENDER TABEL TIKET TERBARU
// ------------------------------------------------------------

/**
 * Membuat HTML string satu baris tabel untuk satu tiket.
 * @param   {Object} ticket
 * @returns {string}
 */
function renderRecentRow(ticket) {
  const statusCfg   = STATUS_BADGE[ticket.status]    || { cls: 'badge-closed', label: ticket.status };
  const priorityCfg = PRIORITY_BADGE[ticket.priority] || { cls: 'badge-low',   label: ticket.priority };

  return `
    <tr>
      <td class="rcol-id">
        <span class="recent-ticket-id">${escapeHtml(ticket.id)}</span>
      </td>
      <td class="rcol-title">
        <span class="recent-ticket-title" title="${escapeHtml(ticket.title)}">
          ${escapeHtml(ticket.title)}
        </span>
      </td>
      <td class="rcol-user">
        <span class="recent-ticket-user">${escapeHtml(ticket.createdByName)}</span>
      </td>
      <td class="rcol-category">${escapeHtml(ticket.category)}</td>
      <td class="rcol-priority">
        <span class="badge ${priorityCfg.cls}">${priorityCfg.label}</span>
      </td>
      <td class="rcol-status">
        <span class="badge ${statusCfg.cls}">${statusCfg.label}</span>
      </td>
      <td class="rcol-date">${formatDate(ticket.createdAt)}</td>
      <td class="rcol-action">
        <a href="ticket-detail.html?id=${escapeHtml(ticket.id)}"
           class="btn-view"
           title="Lihat detail tiket ${escapeHtml(ticket.id)}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Detail
        </a>
      </td>
    </tr>
  `;
}

/**
 * Merender tabel tiket terbaru ke dalam #recent-tbody.
 * Menampilkan empty state jika tidak ada tiket.
 * @param {Array} recentTickets - Array maks 5 tiket terbaru
 */
function renderRecentTable(recentTickets) {
  const tbody    = document.getElementById('recent-tbody');
  const tableEl  = document.getElementById('recent-table-wrap');
  const emptyEl  = document.getElementById('recent-empty');

  if (!tbody) return;

  if (recentTickets.length === 0) {
    if (tableEl) tableEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (tableEl) tableEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  tbody.innerHTML = recentTickets.map(renderRecentRow).join('');
}

// ------------------------------------------------------------
// RENDER RINGKASAN KATEGORI (progress bar teks)
// ------------------------------------------------------------

/**
 * Merender baris ringkasan kategori dengan progress bar.
 * @param {Object} counts - Hasil calcCategoryCount()
 * @param {number} total  - Total seluruh tiket
 */
function renderCategorySummary(counts, total) {
  const container = document.getElementById('category-summary');
  if (!container) return;

  if (total === 0) {
    container.innerHTML = '<p style="font-size:12px;color:var(--color-text-muted);text-align:center;padding:8px 0;">Belum ada data tiket.</p>';
    return;
  }

  container.innerHTML = CATEGORY_CONFIG.map(cat => {
    const count   = counts[cat.name] || 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="category-row">
        <span class="category-name">${cat.name}</span>
        <div class="category-bar-bg">
          <div class="category-bar-fill"
               style="width:${percent}%; background-color:${cat.color};"
               role="progressbar"
               aria-valuenow="${percent}"
               aria-valuemin="0"
               aria-valuemax="100">
          </div>
        </div>
        <span class="category-count">${count}</span>
      </div>
    `;
  }).join('');
}

// ------------------------------------------------------------
// RENDER GRAFIK KATEGORI (Chart.js Doughnut)
// ------------------------------------------------------------

/**
 * Membuat grafik Doughnut menggunakan Chart.js.
 * Data diambil dari hasil calcCategoryCount() — bukan data dummy.
 * @param {Object} counts - { Hardware: n, Software: n, ... }
 * @param {number} total  - Total tiket untuk pesan kosong
 */
function renderCategoryChart(counts, total) {
  const canvas = document.getElementById('category-chart');
  if (!canvas) return;

  // Jika Chart.js belum siap (CDN belum dimuat), skip
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js belum dimuat. Grafik tidak akan ditampilkan.');
    return;
  }

  const labels = CATEGORY_CONFIG.map(c => c.name);
  const data   = CATEGORY_CONFIG.map(c => counts[c.name] || 0);
  const colors = CATEGORY_CONFIG.map(c => c.color);

  // Hapus instance chart lama jika ada (mencegah error "canvas is already in use")
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  // Jika tidak ada tiket sama sekali, tampilkan grafik kosong berisi placeholder
  const isEmpty = total === 0;
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: isEmpty ? ['Belum ada tiket'] : labels,
      datasets: [{
        data:            isEmpty ? [1]      : data,
        backgroundColor: isEmpty ? ['#e5e7eb'] : colors,
        borderWidth:     2,
        borderColor:     '#ffffff',
        hoverOffset:     4,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '62%',        // Membuat donut chart
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font:        { size: 11, family: "'Segoe UI', sans-serif" },
            padding:     10,
            boxWidth:    12,
            boxHeight:   12,
            color:       '#6b7280',
          },
        },
        tooltip: {
          enabled: !isEmpty,             // Nonaktifkan tooltip di kondisi kosong
          callbacks: {
            label: function (ctx) {
              const val     = ctx.parsed;
              const percent = total > 0 ? Math.round((val / total) * 100) : 0;
              return ` ${ctx.label}: ${val} tiket (${percent}%)`;
            },
          },
        },
      },
    },
  });
}

// ------------------------------------------------------------
// RENDER SIDEBAR ADMIN
// ------------------------------------------------------------

/**
 * Mengisi info nama dan role admin di sidebar.
 * @param {Object} session - Data sesi dari getSession()
 */
function renderAdminSidebar(session) {
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) {
    roleEl.textContent = 'Admin';
    roleEl.classList.add('role-admin');  // Warna ungu untuk Admin (dari dashboard.css)
  }

  // Sapaan di welcome banner
  const welcomeNameEl = document.getElementById('admin-welcome-name');
  if (welcomeNameEl) welcomeNameEl.textContent = session.name;
}

// ------------------------------------------------------------
// INISIALISASI HALAMAN ADMIN DASHBOARD
// ------------------------------------------------------------

/**
 * Menginisialisasi seluruh halaman Admin Dashboard.
 * Urutan kerja:
 * 1. Proteksi halaman (wajib login sebagai 'admin')
 * 2. Ambil sesi dan render sidebar
 * 3. Ambil semua tiket dari LocalStorage
 * 4. Hitung statistik dan render stat cards
 * 5. Render welcome meta
 * 6. Ambil dan render tiket terbaru (maks 5)
 * 7. Hitung dan render ringkasan kategori
 * 8. Render grafik kategori (Chart.js)
 * 9. Pasang event logout
 */
function initAdminDashboard() {
  // 1. Proteksi: hanya role 'admin' yang boleh masuk
  requireLogin('admin');

  // 2. Ambil sesi
  const session = getSession();
  if (!session) return;

  // 3. Render sidebar
  renderAdminSidebar(session);

  // 4. Ambil semua tiket
  const allTickets = getAllTickets();

  // 5. Hitung statistik dan render stat cards
  const stats = calcStats(allTickets);
  renderAdminStatCards(stats);

  // 6. Render angka di welcome banner
  renderWelcomeMeta(stats);

  // 7. Render tabel tiket terbaru (maks 5)
  const recent = getRecentTickets(allTickets);
  renderRecentTable(recent);

  // 8. Hitung distribusi per kategori
  const counts = calcCategoryCount(allTickets);

  // 9. Render ringkasan kategori (progress bar)
  renderCategorySummary(counts, stats.total);

  // 10. Render grafik Doughnut (Chart.js)
  //     Dibungkus setTimeout agar Chart.js dari CDN pasti sudah siap
  setTimeout(function () {
    renderCategoryChart(counts, stats.total);
  }, 0);

  // 11. Pasang event logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// ------------------------------------------------------------
// JALANKAN SAAT DOM SIAP
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initAdminDashboard);
