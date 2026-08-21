// ============================================================
// manage-users.js
// Logika untuk halaman Manage Users (Admin)
// Fitur: tampil tabel user, tambah user, toggle aktif/nonaktif,
//        hapus user, validasi form, proteksi akun admin
// Bergantung pada: utils.js dan auth.js
// ============================================================

// ------------------------------------------------------------
// KONSTANTA
// ------------------------------------------------------------

/**
 * ID akun admin utama yang tidak boleh dinonaktifkan atau dihapus.
 * Mengacu pada data seed di utils.js (USR-001, role 'admin').
 * Semua akun dengan role 'admin' dilindungi secara umum.
 */
const PROTECTED_ADMIN_ROLE = 'admin';

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
// AMBIL DATA USER
// ------------------------------------------------------------

/**
 * Mengambil semua user dari LocalStorage, diurutkan:
 * Admin di atas, lalu User diurutkan berdasarkan createdAt.
 * @returns {Array}
 */
function getAllUsers() {
  const users = getFromStorage(STORAGE_KEYS.USERS, []);
  return users.slice().sort(function (a, b) {
    // Admin selalu di atas
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    // Sesama role: urutkan dari yang terdahulu (createdAt ascending)
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

/**
 * Memeriksa apakah sebuah akun dilindungi dari modifikasi.
 * Semua akun dengan role 'admin' dilindungi.
 * @param   {Object}  user
 * @returns {boolean}
 */
function isProtected(user) {
  return user.role === PROTECTED_ADMIN_ROLE;
}

// ------------------------------------------------------------
// RENDER TABEL USER
// ------------------------------------------------------------

/**
 * Membuat HTML string satu baris <tr> untuk satu user.
 * Baris admin menampilkan teks "Akun ini dilindungi" sebagai
 * pengganti tombol aksi.
 * @param   {Object} user
 * @returns {string}
 */
function renderUserRow(user) {
  const protected_ = isProtected(user);

  // Badge role
  const roleCls   = user.role === 'admin' ? 'badge-role-admin' : 'badge-role-user';
  const roleLabel = user.role === 'admin' ? 'Admin' : 'User';

  // Badge status akun
  const statusCls   = user.isActive ? 'badge-active'   : 'badge-inactive';
  const statusLabel = user.isActive ? 'Aktif'          : 'Nonaktif';

  // Kelas baris — baris nonaktif lebih redup
  const rowClass = user.isActive ? '' : 'row-inactive';

  // Kolom aksi — berbeda untuk admin vs user biasa
  let actionHtml;
  if (protected_) {
    // Akun admin: tidak bisa diubah
    actionHtml = `
      <span class="protected-note">Akun dilindungi</span>
    `;
  } else {
    // Akun user biasa: tombol toggle + hapus
    const toggleClass = user.isActive ? 'deactivate' : 'activate';
    const toggleLabel = user.isActive ? 'Nonaktifkan' : 'Aktifkan';
    const toggleIcon  = user.isActive
      ? `<svg viewBox="0 0 24 24" aria-hidden="true">
           <circle cx="12" cy="12" r="10"/>
           <line x1="8" y1="12" x2="16" y2="12"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true">
           <circle cx="12" cy="12" r="10"/>
           <line x1="12" y1="8" x2="12" y2="16"/>
           <line x1="8"  y1="12" x2="16" y2="12"/>
         </svg>`;

    actionHtml = `
      <div class="action-group">
        <button
          type="button"
          class="btn-toggle ${toggleClass}"
          data-action="toggle"
          data-user-id="${escapeHtml(user.id)}"
          title="${toggleLabel} akun ${escapeHtml(user.name)}"
        >
          ${toggleIcon}
          ${toggleLabel}
        </button>
        <button
          type="button"
          class="btn-delete"
          data-action="delete"
          data-user-id="${escapeHtml(user.id)}"
          data-user-name="${escapeHtml(user.name)}"
          title="Hapus akun ${escapeHtml(user.name)}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Hapus
        </button>
      </div>
    `;
  }

  return `
    <tr class="${rowClass}" data-user-id="${escapeHtml(user.id)}">
      <td class="ucol-id">
        <span class="user-id">${escapeHtml(user.id)}</span>
      </td>
      <td class="ucol-name">
        <span class="user-name">${escapeHtml(user.name)}</span>
      </td>
      <td class="ucol-username">
        <span class="user-username">@${escapeHtml(user.username)}</span>
      </td>
      <td class="ucol-role">
        <span class="badge ${roleCls}">${roleLabel}</span>
      </td>
      <td class="ucol-status">
        <span class="badge ${statusCls}">${statusLabel}</span>
      </td>
      <td class="ucol-date">${formatDate(user.createdAt)}</td>
      <td class="ucol-action">${actionHtml}</td>
    </tr>
  `;
}

/**
 * Merender tabel user ke #users-tbody.
 * Menampilkan empty state jika tidak ada user (fallback).
 * @param {Array} users - Array user yang sudah diurutkan
 */
function renderUsersTable(users) {
  const tbody     = document.getElementById('users-tbody');
  const tableWrap = document.getElementById('users-table-wrap');
  const emptyEl   = document.getElementById('empty-all');

  if (!tbody) return;

  if (users.length === 0) {
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyEl)   emptyEl.style.display   = 'flex';
    return;
  }

  if (tableWrap) tableWrap.style.display = 'block';
  if (emptyEl)   emptyEl.style.display   = 'none';

  tbody.innerHTML = users.map(renderUserRow).join('');

  // Pasang event listener pada tombol aksi yang baru di-render
  attachActionListeners();
}

// ------------------------------------------------------------
// UPDATE JUMLAH USER
// ------------------------------------------------------------

/**
 * Memperbarui teks ringkasan jumlah user.
 * @param {Array} users
 */
function updateUserCount(users) {
  const el = document.getElementById('user-count');
  if (!el) return;
  const total  = users.length;
  const active = users.filter(u => u.isActive).length;
  el.textContent = `${total} akun (${active} aktif)`;
}

// ------------------------------------------------------------
// REFRESH TABEL — baca ulang dari LocalStorage dan render ulang
// ------------------------------------------------------------

/**
 * Membaca ulang data user dari LocalStorage dan render ulang tabel.
 * Dipanggil setelah setiap perubahan data.
 */
function refreshUsersTable() {
  const users = getAllUsers();
  renderUsersTable(users);
  updateUserCount(users);
}

// ------------------------------------------------------------
// TOGGLE AKTIF / NONAKTIF
// ------------------------------------------------------------

/**
 * Mengubah status isActive user di LocalStorage.
 * Akun admin tidak bisa diubah lewat fungsi ini.
 * @param {string} userId - ID user yang akan diubah
 */
function toggleUserActive(userId) {
  const users = getFromStorage(STORAGE_KEYS.USERS, []);
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    console.error('User tidak ditemukan:', userId);
    return;
  }

  const user = users[index];

  // Proteksi ganda: admin tidak boleh diubah
  if (isProtected(user)) {
    console.warn('Akun admin tidak dapat dinonaktifkan.');
    return;
  }

  // Toggle isActive
  users[index] = { ...user, isActive: !user.isActive };

  saveToStorage(STORAGE_KEYS.USERS, users);

  const status = users[index].isActive ? 'diaktifkan' : 'dinonaktifkan';
  refreshUsersTable();
  showToast(`Akun "${escapeHtml(user.name)}" berhasil ${status}.`);
}

// ------------------------------------------------------------
// HAPUS USER
// ------------------------------------------------------------

/**
 * Menghapus akun user dari LocalStorage setelah konfirmasi.
 * Akun admin tidak bisa dihapus.
 * Data tiket dan komentar milik user yang dihapus TIDAK ikut terhapus
 * sesuai requirement.
 * @param {string} userId   - ID user yang akan dihapus
 * @param {string} userName - Nama user untuk pesan konfirmasi
 */
function deleteUser(userId, userName) {
  // Tampilkan dialog konfirmasi browser-native
  const confirmed = window.confirm(
    `Apakah Anda yakin ingin menghapus akun "${userName}"?\n\nTindakan ini tidak dapat dibatalkan.`
  );

  if (!confirmed) return;

  const users = getFromStorage(STORAGE_KEYS.USERS, []);
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    console.error('User tidak ditemukan:', userId);
    return;
  }

  const user = users[index];

  // Proteksi ganda: admin tidak boleh dihapus
  if (isProtected(user)) {
    console.warn('Akun admin tidak dapat dihapus.');
    return;
  }

  // Hapus hanya dari array users — tiket dan komentar TIDAK dihapus
  users.splice(index, 1);
  saveToStorage(STORAGE_KEYS.USERS, users);

  refreshUsersTable();
  showToast(`Akun "${escapeHtml(user.name)}" berhasil dihapus.`);
}

// ------------------------------------------------------------
// EVENT LISTENER TOMBOL AKSI DI TABEL
// Dipasang ulang setiap kali tbody di-render
// ------------------------------------------------------------

/**
 * Memasang event listener pada semua tombol Toggle dan Hapus di tbody.
 * Menggunakan event delegation via data-action attribute.
 */
function attachActionListeners() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  tbody.querySelectorAll('[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const action   = btn.dataset.action;
      const userId   = btn.dataset.userId;
      const userName = btn.dataset.userName || userId;

      if (action === 'toggle') {
        toggleUserActive(userId);
      } else if (action === 'delete') {
        deleteUser(userId, userName);
      }
    });
  });
}

// ------------------------------------------------------------
// FORM TAMBAH USER BARU
// ------------------------------------------------------------

/**
 * Menampilkan pesan error di bawah satu field form.
 * @param {string} fieldId  - ID elemen input
 * @param {string} message  - Pesan error
 */
function showFieldError(fieldId, message) {
  const field   = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (field)   field.classList.add('input-error');
  if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
}

/**
 * Menghapus pesan error dari satu field form.
 * @param {string} fieldId
 */
function clearFieldError(fieldId) {
  const field   = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (field)   field.classList.remove('input-error');
  if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
}

/**
 * Menampilkan banner error di level form.
 * @param {string} message
 */
function showFormError(message) {
  const banner = document.getElementById('form-error-msg');
  if (!banner) return;
  banner.querySelector('span').textContent = message;
  banner.classList.add('visible');
}

/**
 * Menyembunyikan banner error form.
 */
function hideFormError() {
  const banner = document.getElementById('form-error-msg');
  if (banner) banner.classList.remove('visible');
}

/**
 * Menampilkan banner sukses di form.
 * @param {string} message
 */
function showFormSuccess(message) {
  const banner = document.getElementById('form-success-msg');
  if (!banner) return;
  banner.querySelector('span').textContent = message;
  banner.classList.add('visible');
  // Auto-sembunyikan setelah 3 detik
  setTimeout(function () {
    banner.classList.remove('visible');
  }, 3000);
}

/**
 * Memvalidasi form tambah user.
 * Memeriksa: nama tidak kosong, username tidak kosong,
 * username unik, password tidak kosong.
 * @returns {boolean} true jika valid
 */
function validateAddUserForm() {
  const name     = document.getElementById('field-name')?.value.trim()     || '';
  const username = document.getElementById('field-username')?.value.trim() || '';
  const password = document.getElementById('field-password')?.value.trim() || '';

  // Bersihkan error sebelumnya
  ['field-name', 'field-username', 'field-password'].forEach(clearFieldError);
  hideFormError();

  let valid = true;

  if (!name) {
    showFieldError('field-name', 'Nama tidak boleh kosong.');
    valid = false;
  }

  if (!username) {
    showFieldError('field-username', 'Username tidak boleh kosong.');
    valid = false;
  } else {
    // Cek keunikan username (case-insensitive)
    const existing = getFromStorage(STORAGE_KEYS.USERS, []);
    const duplicate = existing.some(
      u => u.username.toLowerCase() === username.toLowerCase()
    );
    if (duplicate) {
      showFieldError('field-username', `Username "${escapeHtml(username)}" sudah digunakan.`);
      valid = false;
    }
  }

  if (!password) {
    showFieldError('field-password', 'Password tidak boleh kosong.');
    valid = false;
  } else if (password.length < 6) {
    showFieldError('field-password', 'Password minimal 6 karakter.');
    valid = false;
  }

  return valid;
}

/**
 * Memproses submit form tambah user baru.
 * Alur: validasi → buat objek user → simpan → refresh tabel → reset form.
 * @param {Event} event
 */
function handleAddUser(event) {
  event.preventDefault();

  if (!validateAddUserForm()) return;

  const name     = document.getElementById('field-name').value.trim();
  const username = document.getElementById('field-username').value.trim();
  const password = document.getElementById('field-password').value.trim();

  const users = getFromStorage(STORAGE_KEYS.USERS, []);

  // Buat objek user baru sesuai data model
  const newUser = {
    id:        generateId('USR', users),      // USR-004, USR-005, dst
    name:      name,
    username:  username,
    password:  encodePassword(password),      // Encode Base64 sebelum disimpan
    role:      'user',                        // Role baru selalu 'user'
    isActive:  true,                          // Default aktif
    createdAt: getNow(),
  };

  // Tambahkan ke array dan simpan
  users.push(newUser);
  saveToStorage(STORAGE_KEYS.USERS, users);

  // Refresh tabel dan tampilkan pesan sukses
  refreshUsersTable();
  showFormSuccess(`Akun "${escapeHtml(name)}" (@${escapeHtml(username)}) berhasil ditambahkan.`);
  showToast(`Akun baru "${escapeHtml(name)}" berhasil dibuat.`);

  // Reset form
  document.getElementById('form-add-user').reset();
  ['field-name', 'field-username', 'field-password'].forEach(clearFieldError);
}

// ------------------------------------------------------------
// TOAST NOTIFICATION
// ------------------------------------------------------------

let toastTimer = null;

/**
 * Menampilkan notifikasi sukses sementara di pojok kanan bawah.
 * @param {string} message
 */
function showToast(message) {
  const toast  = document.getElementById('toast-notification');
  const textEl = document.getElementById('toast-text');
  if (!toast || !textEl) return;

  textEl.textContent = message;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);
}

// ------------------------------------------------------------
// RENDER SIDEBAR ADMIN
// ------------------------------------------------------------

/**
 * Mengisi nama dan role admin di sidebar.
 * @param {Object} session
 */
function renderUsersSidebar(session) {
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) {
    roleEl.textContent = 'Admin';
    roleEl.classList.add('role-admin');
  }
}

// ------------------------------------------------------------
// INISIALISASI HALAMAN MANAGE USERS
// ------------------------------------------------------------

/**
 * Menginisialisasi seluruh halaman Manage Users.
 * Urutan kerja:
 * 1. Proteksi (wajib login sebagai 'admin')
 * 2. Render sidebar
 * 3. Render tabel user awal
 * 4. Pasang event submit form tambah user
 * 5. Pasang event hapus error saat mengetik
 * 6. Pasang event logout
 */
function initManageUsersPage() {
  // 1. Proteksi halaman
  requireLogin('admin');

  // 2. Ambil sesi
  const session = getSession();
  if (!session) return;

  // 3. Render sidebar
  renderUsersSidebar(session);

  // 4. Render tabel user awal
  refreshUsersTable();

  // 5. Pasang event submit pada form tambah user
  const addForm = document.getElementById('form-add-user');
  if (addForm) {
    addForm.addEventListener('submit', handleAddUser);
  }

  // 6. Hapus error per-field saat user mulai mengetik
  [
    { id: 'field-name',     event: 'input'  },
    { id: 'field-username', event: 'input'  },
    { id: 'field-password', event: 'input'  },
  ].forEach(function ({ id, event }) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, function () { clearFieldError(id); });
  });

  // 7. Pasang event logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// ------------------------------------------------------------
// JALANKAN SAAT DOM SIAP
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initManageUsersPage);
