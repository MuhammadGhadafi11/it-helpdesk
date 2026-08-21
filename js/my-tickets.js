// ============================================================
// my-tickets.js
// Logika untuk halaman Tiket Saya (daftar tiket milik user)
// Bergantung pada: utils.js dan auth.js
// ============================================================

// ------------------------------------------------------------
// KONFIGURASI BADGE
// Memetakan nilai status/prioritas ke class CSS dan teks label
// ------------------------------------------------------------

/**
 * Konfigurasi badge untuk setiap nilai status tiket.
 * Kunci = nilai status di data, nilai = { class CSS, teks label }
 */
const STATUS_BADGE = {
  'Open':        { cls: 'badge-open',       label: 'Open'        },
  'In Progress': { cls: 'badge-inprogress', label: 'In Progress' },
  'Resolved':    { cls: 'badge-resolved',   label: 'Resolved'    },
  'Closed':      { cls: 'badge-closed',     label: 'Closed'      },
};

/**
 * Konfigurasi badge untuk setiap nilai prioritas tiket.
 */
const PRIORITY_BADGE = {
  'Low':    { cls: 'badge-low',    label: 'Low'    },
  'Medium': { cls: 'badge-medium', label: 'Medium' },
  'High':   { cls: 'badge-high',   label: 'High'   },
};

// ------------------------------------------------------------
// AMBIL DATA TIKET
// ------------------------------------------------------------

/**
 * Mengambil semua tiket milik user yang sedang login,
 * lalu mengurutkannya dari yang terbaru (createdAt descending).
 * @param   {string} userId - ID user dari session
 * @returns {Array}  Array tiket milik user, sudah diurutkan
 */
function getMyTickets(userId) {
  const allTickets = getFromStorage(STORAGE_KEYS.TICKETS, []);

  // Filter: hanya tiket yang dibuat oleh user ini (BR-08)
  const myTickets = allTickets.filter(ticket => ticket.createdBy === userId);

  // Urutkan dari terbaru ke terlama berdasarkan createdAt
  myTickets.sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return myTickets;
}

/**
 * Menyaring daftar tiket berdasarkan status yang dipilih.
 * Jika filter 'all', kembalikan semua tiket tanpa filter.
 * @param   {Array}  tickets      - Array tiket yang akan disaring
 * @param   {string} statusFilter - Nilai filter: 'all', 'Open', 'In Progress', dll
 * @returns {Array}  Tiket yang sudah difilter
 */
function filterTicketsByStatus(tickets, statusFilter) {
  if (statusFilter === 'all') return tickets;
  return tickets.filter(ticket => ticket.status === statusFilter);
}

// ------------------------------------------------------------
// RENDER BADGE
// Menghasilkan HTML string untuk satu badge
// ------------------------------------------------------------

/**
 * Membuat HTML string untuk badge status tiket.
 * @param   {string} status - Nilai status tiket
 * @returns {string} HTML string badge
 */
function renderStatusBadge(status) {
  const config = STATUS_BADGE[status] || { cls: 'badge-closed', label: status };
  return `<span class="badge ${config.cls}">${config.label}</span>`;
}

/**
 * Membuat HTML string untuk badge prioritas tiket.
 * @param   {string} priority - Nilai prioritas tiket
 * @returns {string} HTML string badge
 */
function renderPriorityBadge(priority) {
  const config = PRIORITY_BADGE[priority] || { cls: 'badge-low', label: priority };
  return `<span class="badge ${config.cls}">${config.label}</span>`;
}

// ------------------------------------------------------------
// RENDER DAFTAR TIKET
// Membuat HTML untuk setiap baris tiket di tabel
// ------------------------------------------------------------

/**
 * Merender satu baris <tr> untuk satu tiket.
 * @param   {Object} ticket - Objek tiket
 * @returns {string} HTML string satu baris tabel
 */
function renderTicketRow(ticket) {
  return `
    <tr>
      <td class="col-id">
        <span class="ticket-id">${ticket.id}</span>
      </td>
      <td class="col-title">
        <span class="ticket-title">${escapeHtml(ticket.title)}</span>
      </td>
      <td class="col-category">
        <span class="category-text">${ticket.category}</span>
      </td>
      <td class="col-priority">
        ${renderPriorityBadge(ticket.priority)}
      </td>
      <td class="col-status">
        ${renderStatusBadge(ticket.status)}
      </td>
      <td class="col-date">
        ${formatDate(ticket.createdAt)}
      </td>
      <td class="col-action">
        <a
          href="ticket-detail.html?id=${ticket.id}"
          class="btn btn-detail"
          title="Lihat detail tiket ${ticket.id}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Lihat Detail
        </a>
      </td>
    </tr>
  `;
}

/**
 * Merender seluruh isi <tbody> tabel tiket.
 * Dipanggil setiap kali filter berubah.
 * @param {Array} tickets - Array tiket yang akan ditampilkan
 */
function renderTicketTable(tickets) {
  const tbody       = document.getElementById('ticket-tbody');
  const tableWrap   = document.getElementById('table-section');
  const emptyFilter = document.getElementById('empty-filter');
  const emptyAll    = document.getElementById('empty-all');

  if (!tbody) return;

  if (tickets.length === 0) {
    // Sembunyikan tabel
    if (tableWrap) tableWrap.style.display = 'none';

    // Putuskan: apakah karena filter tidak cocok atau memang tidak ada tiket?
    const activeFilter = document.getElementById('filter-status')
                           ? document.getElementById('filter-status').value
                           : 'all';

    if (activeFilter !== 'all') {
      // Ada filter aktif tapi tidak cocok
      if (emptyFilter) emptyFilter.style.display = 'flex';
      if (emptyAll)    emptyAll.style.display    = 'none';
    } else {
      // Tidak ada tiket sama sekali
      if (emptyFilter) emptyFilter.style.display = 'none';
      if (emptyAll)    emptyAll.style.display    = 'flex';
    }
    return;
  }

  // Ada tiket yang ditampilkan: tampilkan tabel, sembunyikan empty state
  if (tableWrap)   tableWrap.style.display   = 'block';
  if (emptyFilter) emptyFilter.style.display = 'none';
  if (emptyAll)    emptyAll.style.display    = 'none';

  // Isi baris tabel
  tbody.innerHTML = tickets.map(renderTicketRow).join('');
}

// ------------------------------------------------------------
// UPDATE JUMLAH TIKET YANG DITAMPILKAN
// Perbarui teks "Menampilkan X tiket" di atas tabel
// ------------------------------------------------------------

/**
 * Memperbarui teks ringkasan jumlah tiket yang ditampilkan.
 * @param {number} shown - Jumlah tiket setelah filter
 * @param {number} total - Total tiket milik user
 */
function updateTicketCount(shown, total) {
  const countEl = document.getElementById('ticket-count');
  if (!countEl) return;

  if (shown === total) {
    countEl.textContent = `${total} tiket`;
  } else {
    countEl.textContent = `${shown} dari ${total} tiket`;
  }
}

// ------------------------------------------------------------
// HANDLER FILTER
// Dipanggil setiap kali dropdown filter berubah
// ------------------------------------------------------------

/**
 * Memproses perubahan filter status.
 * Mengambil tiket terbaru dari LocalStorage, filter, lalu render ulang.
 * Tidak perlu reload halaman — semua terjadi di memory.
 * @param {string} userId - ID user yang sedang login
 */
function handleFilterChange(userId) {
  const filterEl = document.getElementById('filter-status');
  if (!filterEl) return;

  const selectedStatus = filterEl.value;

  // Ambil ulang data terbaru dari LocalStorage (antisipasi perubahan data)
  const myTickets      = getMyTickets(userId);
  const filteredTickets = filterTicketsByStatus(myTickets, selectedStatus);

  // Render tabel dengan tiket hasil filter
  renderTicketTable(filteredTickets);

  // Perbarui jumlah yang ditampilkan
  updateTicketCount(filteredTickets.length, myTickets.length);
}

// ------------------------------------------------------------
// ESCAPE HTML
// Mencegah XSS jika ada karakter HTML di judul tiket
// ------------------------------------------------------------

/**
 * Mengubah karakter HTML berbahaya menjadi entitas HTML yang aman.
 * Penting untuk data yang ditampilkan dari input user.
 * @param   {string} str - String yang akan di-escape
 * @returns {string} String yang sudah aman
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
// RENDER INFO USER DI SIDEBAR
// ------------------------------------------------------------

/**
 * Menampilkan nama dan role user yang sedang login di sidebar.
 * @param {Object} session - Data sesi dari getSession()
 */
function renderSidebarUser(session) {
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) roleEl.textContent = 'User';
}

// ------------------------------------------------------------
// INISIALISASI HALAMAN MY TICKETS
// ------------------------------------------------------------

/**
 * Menginisialisasi seluruh halaman Tiket Saya.
 * Urutan kerja:
 * 1. Proteksi halaman (wajib login sebagai 'user')
 * 2. Tampilkan info user di sidebar
 * 3. Ambil dan render daftar tiket milik user
 * 4. Pasang event listener pada dropdown filter
 * 5. Pasang event logout
 */
function initMyTicketsPage() {
  // 1. Proteksi: hanya role 'user' yang boleh masuk
  requireLogin('user');

  // 2. Ambil sesi
  const session = getSession();
  if (!session) return;

  // 3. Tampilkan info user di sidebar
  renderSidebarUser(session);

  // 4. Ambil tiket milik user (sudah diurutkan terbaru dulu)
  const myTickets = getMyTickets(session.id);

  // 5. Render tabel dengan semua tiket (belum ada filter)
  renderTicketTable(myTickets);
  updateTicketCount(myTickets.length, myTickets.length);

  // 6. Pasang event listener pada dropdown filter
  const filterEl = document.getElementById('filter-status');
  if (filterEl) {
    filterEl.addEventListener('change', function () {
      handleFilterChange(session.id);
    });
  }

  // 7. Pasang event logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// ------------------------------------------------------------
// JALANKAN SAAT DOM SIAP
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initMyTicketsPage);
