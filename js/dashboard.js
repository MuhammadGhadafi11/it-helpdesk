// ============================================================
// dashboard.js
// Logika untuk halaman dashboard User dan Admin
// Bergantung pada: utils.js dan auth.js
// ============================================================

// ------------------------------------------------------------
// STATISTIK TIKET USER
// Menghitung jumlah tiket milik user yang sedang login
// berdasarkan field "createdBy" di setiap tiket
// ------------------------------------------------------------

/**
 * Mengambil semua tiket milik user yang sedang login.
 * @param   {string} userId - ID user yang sedang login
 * @returns {Array}  Array tiket milik user tersebut
 */
function getTicketsByUser(userId) {
  const allTickets = getFromStorage(STORAGE_KEYS.TICKETS, []);
  // Filter: hanya tiket yang createdBy-nya sama dengan userId
  return allTickets.filter(ticket => ticket.createdBy === userId);
}

/**
 * Menghitung statistik tiket berdasarkan status.
 * @param   {Array}  tickets - Array tiket yang akan dihitung
 * @returns {Object} Objek berisi total dan jumlah per status
 */
function countTicketStats(tickets) {
  return {
    total:      tickets.length,
    open:       tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved:   tickets.filter(t => t.status === 'Resolved').length,
    closed:     tickets.filter(t => t.status === 'Closed').length,
  };
}

// ------------------------------------------------------------
// RENDER STAT CARDS
// Mengisi angka ke dalam elemen stat card di HTML
// ------------------------------------------------------------

/**
 * Mengisi angka statistik ke dalam elemen stat card.
 * Fungsi ini mencari elemen berdasarkan ID dan mengisi teksnya.
 * @param {Object} stats - Hasil dari countTicketStats()
 */
function renderStatCards(stats) {
  // Setiap elemen <span> di HTML punya ID sesuai nama statnya
  const elements = {
    'stat-total':      stats.total,
    'stat-open':       stats.open,
    'stat-inprogress': stats.inProgress,
    'stat-resolved':   stats.resolved,
  };

  for (const [id, value] of Object.entries(elements)) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
}

// ------------------------------------------------------------
// RENDER EMPTY STATE / NORMAL STATE
// Menampilkan pesan kosong jika user belum punya tiket,
// atau menampilkan stat cards jika sudah ada tiket
// ------------------------------------------------------------

/**
 * Mengatur tampilan berdasarkan ada tidaknya tiket.
 * @param {number} totalTickets - Total tiket milik user
 */
function renderDashboardState(totalTickets) {
  const statsSection = document.getElementById('stats-section');
  const emptySection = document.getElementById('empty-section');

  if (!statsSection || !emptySection) return;

  if (totalTickets === 0) {
    // Belum ada tiket: tampilkan empty state, sembunyikan stat cards
    statsSection.style.display = 'none';
    emptySection.style.display = 'flex';
  } else {
    // Sudah ada tiket: tampilkan stat cards, sembunyikan empty state
    statsSection.style.display = 'block';
    emptySection.style.display = 'none';
  }
}

// ------------------------------------------------------------
// RENDER INFO USER
// Mengisi nama user dan role ke elemen di sidebar dan topbar
// ------------------------------------------------------------

/**
 * Menampilkan nama dan role user yang sedang login di UI.
 * @param {Object} session - Data sesi dari getSession()
 */
function renderUserInfo(session) {
  // Nama di sidebar
  const sidebarName = document.getElementById('sidebar-user-name');
  if (sidebarName) sidebarName.textContent = session.name;

  // Role badge di sidebar
  const sidebarRole = document.getElementById('sidebar-user-role');
  if (sidebarRole) {
    sidebarRole.textContent = session.role === 'admin' ? 'Admin' : 'User';
    // Tambahkan class berbeda untuk admin agar warnanya ungu
    if (session.role === 'admin') {
      sidebarRole.classList.add('role-admin');
    }
  }

  // Sapaan di welcome banner
  const welcomeName = document.getElementById('welcome-name');
  if (welcomeName) welcomeName.textContent = session.name;
}

// ------------------------------------------------------------
// INISIALISASI DASHBOARD USER
// Dipanggil saat halaman user-dashboard.html selesai dimuat
// ------------------------------------------------------------

/**
 * Menginisialisasi seluruh konten halaman Dashboard User.
 * Urutan kerja:
 * 1. Proteksi halaman (wajib login sebagai 'user')
 * 2. Ambil data sesi
 * 3. Tampilkan info user di UI
 * 4. Hitung dan tampilkan statistik tiket
 * 5. Pasang event listener tombol logout
 */
function initUserDashboard() {
  // 1. Proteksi halaman: hanya role 'user' yang boleh masuk
  requireLogin('user');

  // 2. Ambil data sesi user yang sedang login
  const session = getSession();

  // Jika karena suatu alasan session null, stop (requireLogin sudah handle redirect)
  if (!session) return;

  // 3. Tampilkan nama dan role user di UI
  renderUserInfo(session);

  // 4. Ambil tiket milik user ini, hitung statistiknya
  const myTickets = getTicketsByUser(session.id);
  const stats     = countTicketStats(myTickets);

  // 5. Isi angka ke stat cards
  renderStatCards(stats);

  // 6. Tampilkan atau sembunyikan empty state
  renderDashboardState(stats.total);

  // 7. Pasang event logout pada tombol logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// ------------------------------------------------------------
// JALANKAN SAAT DOM SIAP
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initUserDashboard);
