// ============================================================
// auth.js
// Menangani logika login, logout, dan proteksi halaman
// ============================================================

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

/**
 * Memproses login pengguna.
 * Dipanggil saat form login di-submit.
 * @param {Event} event - Event submit dari form
 */
function handleLogin(event) {
  // Mencegah form melakukan reload halaman
  event.preventDefault();

  // Ambil nilai dari input form
  const username = document.getElementById('input-username').value.trim();
  const password = document.getElementById('input-password').value.trim();

  // --- Validasi: pastikan kolom tidak kosong ---
  if (!username || !password) {
    showError('Username dan password tidak boleh kosong.');
    return;
  }

  // --- Ambil data semua user dari LocalStorage ---
  const users = getFromStorage(STORAGE_KEYS.USERS, []);

  // --- Cari user berdasarkan username ---
  const user = users.find(u => u.username === username);

  // Jika username tidak ditemukan
  if (!user) {
    showError('Username atau password salah.');
    return;
  }

  // --- Periksa password (decode dulu sebelum dibandingkan) ---
  const passwordAsli = decodePassword(user.password);
  if (passwordAsli !== password) {
    showError('Username atau password salah.');
    return;
  }

  // --- Periksa status akun ---
  if (!user.isActive) {
    showError('Akun Anda tidak aktif. Hubungi Administrator.');
    return;
  }

  // --- Login berhasil: simpan session ---
  const session = {
    id:       user.id,
    name:     user.name,
    username: user.username,
    role:     user.role,
  };
  saveToStorage(STORAGE_KEYS.SESSION, session);

  // --- Arahkan ke dashboard sesuai role ---
  if (user.role === 'admin') {
    window.location.href = 'pages/admin-dashboard.html';
  } else {
    window.location.href = 'pages/user-dashboard.html';
  }
}

// ------------------------------------------------------------
// LOGOUT
// Fungsi ini dapat dipanggil dari halaman mana pun
// ------------------------------------------------------------

/**
 * Menghapus sesi login dan mengarahkan ke halaman login.
 */
function logout() {
  removeFromStorage(STORAGE_KEYS.SESSION);
  window.location.href = '../index.html';
}

// ------------------------------------------------------------
// CEK SESI
// Digunakan oleh halaman yang membutuhkan login
// ------------------------------------------------------------

/**
 * Mengambil data sesi pengguna yang sedang login.
 * @returns {Object|null} Data sesi atau null jika belum login
 */
function getSession() {
  return getFromStorage(STORAGE_KEYS.SESSION, null);
}

/**
 * Memproteksi halaman agar hanya bisa diakses setelah login.
 * Jika belum login, otomatis diarahkan ke halaman login.
 * Panggil fungsi ini di awal setiap halaman yang dilindungi.
 * @param {string} [requiredRole] - Role yang diizinkan: 'user' atau 'admin'
 *                                  Kosongkan jika semua role diizinkan.
 */
function requireLogin(requiredRole = null) {
  const session = getSession();

  // Belum login sama sekali
  if (!session) {
    window.location.href = '../index.html';
    return;
  }

  // Sudah login tapi role tidak sesuai
  if (requiredRole && session.role !== requiredRole) {
    // Arahkan ke dashboard yang sesuai dengan role mereka
    if (session.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'user-dashboard.html';
    }
  }
}

// ------------------------------------------------------------
// TAMPILKAN PESAN ERROR
// Digunakan khusus di halaman login
// ------------------------------------------------------------

/**
 * Menampilkan pesan error di bawah form login.
 * @param {string} message - Pesan yang akan ditampilkan
 */
function showError(message) {
  const errorEl  = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  if (!errorEl || !errorText) return;
  errorText.textContent = message;
  errorEl.style.display = 'flex';
}

/**
 * Menyembunyikan pesan error.
 */
function hideError() {
  const errorEl  = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  if (!errorEl || !errorText) return;
  errorText.textContent = '';
  errorEl.style.display = 'none';
}

// ------------------------------------------------------------
// INISIALISASI HALAMAN LOGIN
// Dijalankan saat DOM halaman login sudah siap.
// Blok ini HANYA aktif di halaman yang memiliki elemen
// #login-form (yaitu index.html). Halaman lain yang ikut
// memuat auth.js tidak akan terdampak.
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  // Cek apakah halaman ini adalah halaman login
  // Jika tidak ada #login-form, hentikan eksekusi blok ini
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  // 1. Buat seed data jika LocalStorage masih kosong
  initSeedData();

  // 2. Jika sudah login, langsung redirect ke dashboard
  //    (agar user tidak perlu login ulang jika sesi masih aktif)
  const session = getSession();
  if (session) {
    if (session.role === 'admin') {
      window.location.href = 'pages/admin-dashboard.html';
    } else {
      window.location.href = 'pages/user-dashboard.html';
    }
    return;
  }

  // 3. Pasang event listener pada form login
  loginForm.addEventListener('submit', handleLogin);

  // 4. Sembunyikan pesan error saat pengguna mulai mengetik ulang
  const inputs = document.querySelectorAll('#input-username, #input-password');
  inputs.forEach(input => {
    input.addEventListener('input', hideError);
  });
});
