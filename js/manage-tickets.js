// ============================================================
// manage-tickets.js
// Logika untuk halaman Manage Tickets (Admin)
// Fitur: filter 3D, update status (business rule), notifikasi
// Bergantung pada: utils.js dan auth.js
// ============================================================

// ------------------------------------------------------------
// KONSTANTA
// ------------------------------------------------------------

// Urutan alur status yang valid (BR-13)
// Index lebih tinggi = status lebih maju
const STATUS_ORDER = ['Open', 'In Progress', 'Resolved', 'Closed'];

// Konfigurasi badge status dan prioritas (didefinisikan ulang
// karena file ini berdiri sendiri — tidak load my-tickets.js)
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
// ------------------------------------------------------------

/**
 * Mengubah karakter HTML berbahaya menjadi entitas yang aman.
 * Mencegah XSS pada data yang ditampilkan dari LocalStorage.
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
// AMBIL DAN URUTKAN TIKET
// ------------------------------------------------------------

/**
 * Mengambil semua tiket dari LocalStorage dan mengurutkan
 * dari yang paling baru (createdAt descending).
 * @returns {Array}
 */
function getAllTicketsSorted() {
  const tickets = getFromStorage(STORAGE_KEYS.TICKETS, []);
  return tickets
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ------------------------------------------------------------
// FILTER 3-DIMENSI
// Menyaring tiket berdasarkan status, prioritas, dan kategori
// Ketiga filter bekerja bersamaan (AND)
// ------------------------------------------------------------

/**
 * Mengambil nilai ketiga filter dari elemen dropdown.
 * @returns {{ status: string, priority: string, category: string }}
 */
function getFilterValues() {
  return {
    status:   document.getElementById('filter-status')?.value   || 'all',
    priority: document.getElementById('filter-priority')?.value || 'all',
    category: document.getElementById('filter-category')?.value || 'all',
  };
}

/**
 * Menyaring array tiket berdasarkan tiga filter sekaligus.
 * Filter 'all' pada dimensi manapun diabaikan.
 * @param   {Array}  tickets  - Array tiket yang akan disaring
 * @param   {Object} filters  - { status, priority, category }
 * @returns {Array}
 */
function applyFilters(tickets, filters) {
  return tickets.filter(ticket => {
    const statusMatch   = filters.status   === 'all' || ticket.status   === filters.status;
    const priorityMatch = filters.priority === 'all' || ticket.priority === filters.priority;
    const categoryMatch = filters.category === 'all' || ticket.category === filters.category;
    return statusMatch && priorityMatch && categoryMatch;
  });
}

// ------------------------------------------------------------
// BUSINESS RULE: UPDATE STATUS
// Open → In Progress → Resolved → Closed (BR-12, BR-13)
// ------------------------------------------------------------

/**
 * Mengembalikan daftar status yang boleh dipilih dari status saat ini.
 * Status hanya boleh maju, tidak boleh mundur.
 * Jika tiket sudah Closed, kembalikan array kosong.
 * @param   {string}   currentStatus
 * @returns {string[]} Array status yang boleh dituju
 */
function getAllowedNextStatuses(currentStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  // Jika Closed (index 3) atau tidak dikenal, tidak ada status berikutnya
  if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) {
    return [];
  }
  // Kembalikan semua status setelah status saat ini
  return STATUS_ORDER.slice(currentIndex + 1);
}

/**
 * Mengecek apakah perpindahan status valid sesuai business rule.
 * @param   {string}  fromStatus - Status asal
 * @param   {string}  toStatus   - Status tujuan
 * @returns {boolean}
 */
function isStatusTransitionValid(fromStatus, toStatus) {
  const fromIndex = STATUS_ORDER.indexOf(fromStatus);
  const toIndex   = STATUS_ORDER.indexOf(toStatus);
  // Valid hanya jika toIndex lebih besar (maju)
  return toIndex > fromIndex;
}

/**
 * Memperbarui status satu tiket di LocalStorage.
 * Juga memperbarui field updatedAt.
 * @param {string} ticketId  - ID tiket yang akan diperbarui
 * @param {string} newStatus - Status baru
 * @returns {boolean} true jika berhasil, false jika gagal validasi
 */
function updateTicketStatus(ticketId, newStatus) {
  const tickets = getFromStorage(STORAGE_KEYS.TICKETS, []);
  const index   = tickets.findIndex(t => t.id === ticketId);

  if (index === -1) {
    console.error(`Tiket ${ticketId} tidak ditemukan.`);
    return false;
  }

  const ticket = tickets[index];

  // Validasi business rule: tidak boleh mundur, tidak boleh dari Closed
  if (!isStatusTransitionValid(ticket.status, newStatus)) {
    console.warn(`Transisi status tidak valid: ${ticket.status} → ${newStatus}`);
    return false;
  }

  // Perbarui status dan updatedAt
  tickets[index] = {
    ...ticket,
    status:    newStatus,
    updatedAt: getNow(),
  };

  // Simpan kembali ke LocalStorage
  saveToStorage(STORAGE_KEYS.TICKETS, tickets);
  return true;
}

// ------------------------------------------------------------
// RENDER BARIS TABEL
// ------------------------------------------------------------

/**
 * Membangun opsi <option> untuk dropdown status di setiap baris.
 * Hanya menampilkan status yang diizinkan (maju) berdasarkan business rule.
 * Jika Closed, select dinonaktifkan.
 * @param   {string} currentStatus
 * @param   {string} ticketId      - Dipakai di atribut data-ticket-id
 * @returns {string} HTML string
 */
function buildStatusSelectHtml(currentStatus, ticketId) {
  const isClosed = currentStatus === 'Closed';

  if (isClosed) {
    // Tiket sudah Closed: tampilkan select nonaktif dengan satu opsi
    return `
      <div>
        <select class="status-select" disabled aria-label="Update status tiket ${escapeHtml(ticketId)}">
          <option value="Closed" selected>Closed</option>
        </select>
        <span class="status-closed-note">Tiket sudah ditutup</span>
      </div>
    `;
  }

  const allowed = getAllowedNextStatuses(currentStatus);
  const options = allowed.map(s =>
    `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`
  ).join('');

  return `
    <select
      class="status-select"
      data-ticket-id="${escapeHtml(ticketId)}"
      data-current-status="${escapeHtml(currentStatus)}"
      aria-label="Update status tiket ${escapeHtml(ticketId)}"
    >
      <option value="">— Pilih Status —</option>
      ${options}
    </select>
  `;
}

/**
 * Membuat HTML string satu baris <tr> untuk satu tiket.
 * @param   {Object} ticket
 * @returns {string}
 */
function renderManageRow(ticket) {
  const statusCfg   = STATUS_BADGE[ticket.status]    || { cls: 'badge-closed', label: ticket.status };
  const priorityCfg = PRIORITY_BADGE[ticket.priority] || { cls: 'badge-low',   label: ticket.priority };

  return `
    <tr data-row-id="${escapeHtml(ticket.id)}">
      <td class="mcol-id">
        <span class="manage-ticket-id">${escapeHtml(ticket.id)}</span>
      </td>
      <td class="mcol-title">
        <span class="manage-ticket-title" title="${escapeHtml(ticket.title)}">
          ${escapeHtml(ticket.title)}
        </span>
      </td>
      <td class="mcol-user">
        <span class="manage-ticket-user">${escapeHtml(ticket.createdByName)}</span>
      </td>
      <td class="mcol-category">${escapeHtml(ticket.category)}</td>
      <td class="mcol-priority">
        <span class="badge ${priorityCfg.cls}">${priorityCfg.label}</span>
      </td>
      <td class="mcol-status">
        <span class="badge ${statusCfg.cls}">${statusCfg.label}</span>
      </td>
      <td class="mcol-date">${formatDate(ticket.createdAt)}</td>
      <td class="mcol-update">
        ${buildStatusSelectHtml(ticket.status, ticket.id)}
      </td>
      <td class="mcol-action">
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

// ------------------------------------------------------------
// RENDER TABEL DAN EMPTY STATE
// ------------------------------------------------------------

/**
 * Merender tabel tiket atau empty state yang sesuai.
 * @param {Array}  filtered - Tiket setelah filter
 * @param {number} total    - Total tiket sebelum filter
 */
function renderManageTable(filtered, total) {
  const tbody      = document.getElementById('manage-tbody');
  const tableWrap  = document.getElementById('manage-table-wrap');
  const emptyAll   = document.getElementById('empty-all');
  const emptyFilt  = document.getElementById('empty-filter');

  if (!tbody) return;

  const filters = getFilterValues();
  const hasActiveFilter = filters.status !== 'all' ||
                          filters.priority !== 'all' ||
                          filters.category !== 'all';

  if (filtered.length === 0) {
    if (tableWrap) tableWrap.style.display = 'none';
    if (total === 0) {
      // Tidak ada tiket sama sekali
      if (emptyAll)  emptyAll.style.display  = 'flex';
      if (emptyFilt) emptyFilt.style.display = 'none';
    } else {
      // Ada tiket tapi tidak cocok filter
      if (emptyAll)  emptyAll.style.display  = 'none';
      if (emptyFilt) emptyFilt.style.display = 'flex';
    }
    return;
  }

  if (tableWrap) tableWrap.style.display = 'block';
  if (emptyAll)  emptyAll.style.display  = 'none';
  if (emptyFilt) emptyFilt.style.display = 'none';

  tbody.innerHTML = filtered.map(renderManageRow).join('');

  // Pasang event listener pada setiap status-select yang baru di-render
  attachStatusSelectListeners();
}

// ------------------------------------------------------------
// UPDATE JUMLAH TIKET
// ------------------------------------------------------------

/**
 * Memperbarui teks "Menampilkan X dari Y tiket".
 * @param {number} shown - Tiket setelah filter
 * @param {number} total - Total tiket
 */
function updateCount(shown, total) {
  const el = document.getElementById('ticket-count');
  if (!el) return;
  if (shown === total) {
    el.textContent = `${total} tiket`;
  } else {
    el.textContent = `${shown} dari ${total} tiket`;
  }
}

// ------------------------------------------------------------
// TOAST NOTIFICATION
// ------------------------------------------------------------

let toastTimer = null;

/**
 * Menampilkan notifikasi sukses sementara di pojok kanan bawah.
 * @param {string} message - Pesan yang ditampilkan
 */
function showToast(message) {
  const toast   = document.getElementById('toast-notification');
  const textEl  = document.getElementById('toast-text');
  if (!toast || !textEl) return;

  textEl.textContent = message;
  toast.classList.add('show');

  // Hapus timer lama jika ada (mencegah konflik)
  if (toastTimer) clearTimeout(toastTimer);

  // Sembunyikan otomatis setelah 3 detik
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ------------------------------------------------------------
// EVENT LISTENER: STATUS SELECT
// Dipasang setelah setiap render karena tbody di-replace
// ------------------------------------------------------------

/**
 * Memasang event 'change' pada semua .status-select di tbody.
 * Saat dipilih: validasi → update LocalStorage → render ulang → toast.
 */
function attachStatusSelectListeners() {
  const selects = document.querySelectorAll('#manage-tbody .status-select');

  selects.forEach(function (select) {
    select.addEventListener('change', function () {
      const ticketId     = select.dataset.ticketId;
      const currentStatus = select.dataset.currentStatus;
      const newStatus    = select.value;

      // Abaikan jika user memilih placeholder
      if (!newStatus) return;

      // Validasi business rule sebelum menyimpan
      if (!isStatusTransitionValid(currentStatus, newStatus)) {
        alert(`Status tidak valid: tidak bisa berpindah dari "${currentStatus}" ke "${newStatus}".`);
        select.value = '';
        return;
      }

      // Simpan ke LocalStorage
      const success = updateTicketStatus(ticketId, newStatus);

      if (success) {
        // Render ulang tabel dengan data terbaru
        refreshTable();
        // Tampilkan notifikasi sukses
        showToast(`Status tiket ${ticketId} berhasil diubah ke "${newStatus}".`);
      }
    });
  });
}

// ------------------------------------------------------------
// REFRESH TABEL (re-render dari data terbaru)
// Dipanggil setelah update status atau perubahan filter
// ------------------------------------------------------------

/**
 * Membaca ulang data dari LocalStorage, terapkan filter saat ini,
 * lalu render ulang tabel dan jumlah tiket.
 */
function refreshTable() {
  const allTickets = getAllTicketsSorted();
  const filters    = getFilterValues();
  const filtered   = applyFilters(allTickets, filters);

  renderManageTable(filtered, allTickets.length);
  updateCount(filtered.length, allTickets.length);
}

// ------------------------------------------------------------
// RESET FILTER
// ------------------------------------------------------------

/**
 * Mereset semua dropdown filter ke nilai 'all' dan memperbarui tabel.
 */
function resetFilters() {
  const statusEl   = document.getElementById('filter-status');
  const priorityEl = document.getElementById('filter-priority');
  const categoryEl = document.getElementById('filter-category');

  if (statusEl)   statusEl.value   = 'all';
  if (priorityEl) priorityEl.value = 'all';
  if (categoryEl) categoryEl.value = 'all';

  refreshTable();
}

// ------------------------------------------------------------
// RENDER SIDEBAR ADMIN
// ------------------------------------------------------------

/**
 * Mengisi info nama dan role admin di sidebar.
 * @param {Object} session
 */
function renderManageSidebar(session) {
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) {
    roleEl.textContent = 'Admin';
    roleEl.classList.add('role-admin');
  }
}

// ------------------------------------------------------------
// INISIALISASI HALAMAN MANAGE TICKETS
// ------------------------------------------------------------

/**
 * Menginisialisasi seluruh halaman Manage Tickets.
 * Urutan kerja:
 * 1. Proteksi halaman (wajib login sebagai 'admin')
 * 2. Render sidebar
 * 3. Ambil tiket dan render tabel awal
 * 4. Pasang event listener pada tiga dropdown filter
 * 5. Pasang event listener tombol Reset Filter
 * 6. Pasang event logout
 */
function initManageTicketsPage() {
  // 1. Proteksi
  requireLogin('admin');

  // 2. Ambil sesi
  const session = getSession();
  if (!session) return;

  // 3. Render sidebar
  renderManageSidebar(session);

  // 4. Render tabel awal (semua tiket, belum ada filter)
  refreshTable();

  // 5. Event listener pada tiga dropdown filter
  ['filter-status', 'filter-priority', 'filter-category'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', refreshTable);
  });

  // 6. Event listener tombol Reset Filter
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetFilters);
  }

  // 7. Event logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// ------------------------------------------------------------
// JALANKAN SAAT DOM SIAP
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initManageTicketsPage);
