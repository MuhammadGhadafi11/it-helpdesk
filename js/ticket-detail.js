// ============================================================
// ticket-detail.js
// Logika untuk halaman Detail Tiket
// Menampilkan data tiket, riwayat komentar, dan form komentar
// Dapat diakses oleh User (tiket miliknya) dan Admin (semua tiket)
// Bergantung pada: utils.js dan auth.js
// ============================================================

// ------------------------------------------------------------
// KONFIGURASI BADGE
// Didefinisikan ulang di sini karena my-tickets.js tidak dimuat
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

// ------------------------------------------------------------
// UTILITAS LOKAL
// Fungsi bantu yang khusus dipakai di halaman ini
// ------------------------------------------------------------

/**
 * Mengubah karakter HTML berbahaya menjadi entitas yang aman.
 * Mencegah XSS pada konten yang berasal dari input user.
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

/**
 * Mengambil nilai query string dari URL.
 * Contoh: URL "ticket-detail.html?id=TKT-001" → getQueryParam('id') → 'TKT-001'
 * @param   {string} name - Nama parameter
 * @returns {string|null}
 */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ------------------------------------------------------------
// AMBIL DATA
// ------------------------------------------------------------

/**
 * Mencari satu tiket berdasarkan ID dari LocalStorage.
 * @param   {string}      ticketId - ID tiket yang dicari
 * @returns {Object|null} Objek tiket atau null jika tidak ditemukan
 */
function getTicketById(ticketId) {
  const tickets = getFromStorage(STORAGE_KEYS.TICKETS, []);
  return tickets.find(t => t.id === ticketId) || null;
}

/**
 * Mengambil semua komentar milik tiket tertentu,
 * diurutkan dari yang paling lama (ascending — kronologis).
 * @param   {string} ticketId
 * @returns {Array}
 */
function getCommentsByTicket(ticketId) {
  const allComments = getFromStorage(STORAGE_KEYS.COMMENTS, []);
  const ticketComments = allComments.filter(c => c.ticketId === ticketId);

  // Urutkan dari terlama ke terbaru (kronologis atas ke bawah)
  ticketComments.sort(function (a, b) {
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return ticketComments;
}

// ------------------------------------------------------------
// RENDER DETAIL TIKET
// Mengisi elemen-elemen HTML dengan data tiket
// ------------------------------------------------------------

/**
 * Mengisi seluruh bagian detail tiket di halaman.
 * @param {Object} ticket - Objek tiket dari LocalStorage
 */
function renderTicketDetail(ticket) {
  // Helper: isi teks ke elemen berdasarkan ID, aman jika elemen tidak ada
  function fill(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // Helper: isi HTML ke elemen berdasarkan ID
  function fillHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // Isi setiap field detail tiket
  fill('detail-id',        ticket.id);
  fill('detail-title',     ticket.title);
  fill('detail-desc',      ticket.description);
  fill('detail-category',  ticket.category);
  fill('detail-createdby', ticket.createdByName);
  fill('detail-createdat', formatDate(ticket.createdAt));
  fill('detail-updatedat', formatDate(ticket.updatedAt));

  // Badge status dan prioritas menggunakan innerHTML
  const statusCfg   = STATUS_BADGE[ticket.status]   || { cls: 'badge-closed', label: ticket.status };
  const priorityCfg = PRIORITY_BADGE[ticket.priority] || { cls: 'badge-low',  label: ticket.priority };

  fillHtml('detail-status',
    `<span class="badge ${statusCfg.cls}">${statusCfg.label}</span>`);
  fillHtml('detail-priority',
    `<span class="badge ${priorityCfg.cls}">${priorityCfg.label}</span>`);

  // Perbarui judul halaman browser
  document.title = `${ticket.id} — IT Helpdesk`;
}

// ------------------------------------------------------------
// RENDER KOMENTAR
// Mengisi daftar komentar ke dalam container #comment-list
// ------------------------------------------------------------

/**
 * Membuat HTML string untuk satu komentar.
 * Admin mendapat highlight warna berbeda agar mudah dibedakan.
 * @param   {Object} comment - Objek komentar
 * @returns {string} HTML string
 */
function renderCommentItem(comment) {
  const isAdmin  = comment.role === 'admin';
  const roleLabel = isAdmin ? 'IT Support' : 'User';
  const itemClass = isAdmin ? 'comment-item comment-item--admin' : 'comment-item';

  return `
    <div class="${itemClass}">
      <div class="comment-header">
        <div class="comment-avatar ${isAdmin ? 'avatar-admin' : 'avatar-user'}">
          ${escapeHtml(comment.createdByName.charAt(0).toUpperCase())}
        </div>
        <div class="comment-meta">
          <span class="comment-author">${escapeHtml(comment.createdByName)}</span>
          <span class="comment-role-badge ${isAdmin ? 'role-it' : 'role-user-badge'}">
            ${roleLabel}
          </span>
          <span class="comment-time">${formatDate(comment.createdAt)}</span>
        </div>
      </div>
      <div class="comment-body">
        <p class="comment-text">${escapeHtml(comment.message)}</p>
      </div>
    </div>
  `;
}

/**
 * Merender seluruh daftar komentar ke dalam #comment-list.
 * Menampilkan pesan jika belum ada komentar.
 * @param {Array} comments - Array komentar untuk tiket ini
 */
function renderCommentList(comments) {
  const listEl      = document.getElementById('comment-list');
  const emptyEl     = document.getElementById('comment-empty');
  const countEl     = document.getElementById('comment-count');

  if (!listEl) return;

  // Perbarui jumlah komentar di header section
  if (countEl) countEl.textContent = comments.length;

  if (comments.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  listEl.innerHTML = comments.map(renderCommentItem).join('');
}

// ------------------------------------------------------------
// SIMPAN KOMENTAR BARU
// ------------------------------------------------------------

/**
 * Membuat objek komentar baru dan menyimpannya ke LocalStorage.
 * @param   {string} ticketId - ID tiket tempat komentar ditambahkan
 * @param   {string} message  - Isi komentar
 * @param   {Object} session  - Data sesi pengguna yang sedang login
 * @returns {Object} Komentar yang baru dibuat
 */
function saveComment(ticketId, message, session) {
  const allComments = getFromStorage(STORAGE_KEYS.COMMENTS, []);

  const newComment = {
    id:            generateId('CMT', allComments), // CMT-001, CMT-002, dst
    ticketId:      ticketId,
    message:       message,
    createdBy:     session.id,
    createdByName: session.name,
    role:          session.role,                   // 'user' atau 'admin'
    createdAt:     getNow(),
  };

  allComments.push(newComment);
  saveToStorage(STORAGE_KEYS.COMMENTS, allComments);

  return newComment;
}

// ------------------------------------------------------------
// HANDLER SUBMIT KOMENTAR
// ------------------------------------------------------------

/**
 * Memproses pengiriman form komentar.
 * Alur: validasi → simpan → render ulang komentar → kosongkan form
 * @param {Event}  event    - Event submit dari form komentar
 * @param {string} ticketId - ID tiket yang sedang dibuka
 * @param {Object} session  - Data sesi pengguna
 */
function handleCommentSubmit(event, ticketId, session) {
  event.preventDefault();

  const textarea = document.getElementById('comment-input');
  const errorEl  = document.getElementById('comment-error');

  if (!textarea) return;

  const message = textarea.value.trim();

  // Validasi: komentar tidak boleh kosong (BR-10 turunan)
  if (!message) {
    if (errorEl) {
      errorEl.textContent = 'Komentar tidak boleh kosong.';
      errorEl.style.display = 'block';
    }
    textarea.focus();
    return;
  }

  // Sembunyikan error jika ada
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  // Simpan komentar ke LocalStorage
  saveComment(ticketId, message, session);

  // Kosongkan textarea dan reset tinggi
  textarea.value = '';

  // Render ulang seluruh daftar komentar tanpa reload halaman
  const updatedComments = getCommentsByTicket(ticketId);
  renderCommentList(updatedComments);

  // Scroll ke komentar terbaru
  const lastComment = document.querySelector('#comment-list .comment-item:last-child');
  if (lastComment) {
    lastComment.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ------------------------------------------------------------
// RENDER SIDEBAR DINAMIS
// Menyesuaikan menu navigasi sidebar berdasarkan role pengguna
// ------------------------------------------------------------

/**
 * Mengisi info user di sidebar dan menyesuaikan menu berdasarkan role.
 * - User  : tampilkan menu Dashboard, Buat Tiket, Tiket Saya
 * - Admin : tampilkan menu Dashboard Admin, Kelola Tiket
 * @param {Object} session - Data sesi pengguna
 */
function renderSidebar(session) {
  // Isi nama dan role badge
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) {
    roleEl.textContent = session.role === 'admin' ? 'Admin' : 'User';
    if (session.role === 'admin') roleEl.classList.add('role-admin');
  }

  // Tampilkan menu yang sesuai, sembunyikan yang lain
  const userNav  = document.getElementById('nav-user');
  const adminNav = document.getElementById('nav-admin');

  if (session.role === 'admin') {
    if (userNav)  userNav.style.display  = 'none';
    if (adminNav) adminNav.style.display = 'block';
  } else {
    if (userNav)  userNav.style.display  = 'block';
    if (adminNav) adminNav.style.display = 'none';
  }

  // Tombol "Kembali" di topbar disesuaikan dengan role
  const backBtn = document.getElementById('btn-back');
  if (backBtn) {
    if (session.role === 'admin') {
      backBtn.href = 'manage-tickets.html';
      backBtn.title = 'Kembali ke Kelola Tiket';
    } else {
      backBtn.href = 'my-tickets.html';
      backBtn.title = 'Kembali ke Tiket Saya';
    }
  }
}

// ------------------------------------------------------------
// TAMPILKAN HALAMAN ERROR
// Digunakan saat tiket tidak ditemukan atau akses ditolak
// ------------------------------------------------------------

/**
 * Menyembunyikan konten tiket dan menampilkan pesan error.
 * @param {string} title   - Judul pesan error
 * @param {string} message - Deskripsi error
 */
function showPageError(title, message) {
  const contentEl = document.getElementById('ticket-content');
  const errorEl   = document.getElementById('page-error');
  const errorTitle = document.getElementById('page-error-title');
  const errorMsg   = document.getElementById('page-error-msg');

  if (contentEl) contentEl.style.display = 'none';
  if (errorEl)   errorEl.style.display   = 'flex';
  if (errorTitle) errorTitle.textContent = title;
  if (errorMsg)   errorMsg.textContent   = message;
}

// ------------------------------------------------------------
// INISIALISASI HALAMAN TICKET DETAIL
// ------------------------------------------------------------

/**
 * Menginisialisasi seluruh halaman Detail Tiket.
 * Urutan kerja:
 * 1. Proteksi halaman (wajib login, semua role diizinkan)
 * 2. Ambil ID tiket dari URL (?id=TKT-xxx)
 * 3. Cari tiket di LocalStorage
 * 4. Validasi akses: User hanya boleh buka tiketnya sendiri
 * 5. Render detail tiket
 * 6. Render komentar
 * 7. Pasang event submit pada form komentar
 * 8. Render sidebar sesuai role
 * 9. Pasang event logout
 */
function initTicketDetailPage() {
  // 1. Proteksi: wajib login, semua role boleh masuk
  requireLogin();

  // 2. Ambil sesi
  const session = getSession();
  if (!session) return;

  // 3. Render sidebar sesuai role (dilakukan lebih awal agar tidak flicker)
  renderSidebar(session);

  // 4. Ambil ID tiket dari parameter URL
  const ticketId = getQueryParam('id');

  if (!ticketId) {
    showPageError('Parameter Tidak Valid', 'Tidak ada ID tiket dalam URL. Silakan kembali ke daftar tiket.');
    return;
  }

  // 5. Cari tiket di LocalStorage
  const ticket = getTicketById(ticketId);

  if (!ticket) {
    showPageError('Tiket Tidak Ditemukan', `Tiket dengan ID "${escapeHtml(ticketId)}" tidak ditemukan dalam sistem.`);
    return;
  }

  // 6. Validasi akses: User hanya boleh membuka tiket miliknya (BR-08)
  //    Admin boleh membuka semua tiket (BR-09)
  if (session.role === 'user' && ticket.createdBy !== session.id) {
    showPageError('Akses Ditolak', 'Anda tidak memiliki izin untuk melihat tiket ini.');
    return;
  }

  // 7. Render detail tiket
  renderTicketDetail(ticket);

  // 8. Ambil dan render komentar tiket ini
  const comments = getCommentsByTicket(ticketId);
  renderCommentList(comments);

  // 9. Pasang event submit pada form komentar
  const commentForm = document.getElementById('comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', function (event) {
      handleCommentSubmit(event, ticketId, session);
    });
  }

  // 10. Hapus pesan error komentar saat user mulai mengetik
  const textarea = document.getElementById('comment-input');
  const errorEl  = document.getElementById('comment-error');
  if (textarea && errorEl) {
    textarea.addEventListener('input', function () {
      if (textarea.value.trim()) {
        errorEl.style.display = 'none';
      }
    });
  }

  // 11. Pasang event logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// ------------------------------------------------------------
// JALANKAN SAAT DOM SIAP
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initTicketDetailPage);
