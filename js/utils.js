// ============================================================
// utils.js
// Fungsi-fungsi bantu yang digunakan oleh seluruh halaman
// ============================================================

// ------------------------------------------------------------
// KONSTANTA KEY LOCALSTORAGE
// Semua key LocalStorage dipusatkan di sini agar mudah diubah
// ------------------------------------------------------------
const STORAGE_KEYS = {
  USERS:    'hd_users',
  TICKETS:  'hd_tickets',
  COMMENTS: 'hd_comments',
  SESSION:  'hd_session',
};

// ------------------------------------------------------------
// LOCALSTORAGE HELPERS
// Fungsi baca dan tulis LocalStorage dengan JSON otomatis
// ------------------------------------------------------------

/**
 * Menyimpan data ke LocalStorage.
 * @param {string} key   - Key LocalStorage
 * @param {*}      value - Data yang akan disimpan (objek/array)
 */
function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Membaca data dari LocalStorage.
 * @param  {string} key          - Key LocalStorage
 * @param  {*}      defaultValue - Nilai default jika key belum ada
 * @returns {*} Data yang sudah di-parse
 */
function getFromStorage(key, defaultValue = null) {
  const data = localStorage.getItem(key);
  if (data === null) return defaultValue;
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

/**
 * Menghapus satu key dari LocalStorage.
 * @param {string} key - Key yang akan dihapus
 */
function removeFromStorage(key) {
  localStorage.removeItem(key);
}

// ------------------------------------------------------------
// ID GENERATOR
// Membuat ID unik berurutan berdasarkan prefix dan data yang ada
// ------------------------------------------------------------

/**
 * Membuat ID unik berurutan.
 * Contoh: generateId('USR', users) → 'USR-004'
 * @param  {string}   prefix - Awalan ID (contoh: 'USR', 'TKT', 'CMT')
 * @param  {Array}    list   - Array data yang sudah ada
 * @returns {string}  ID baru dalam format PREFIX-XXX
 */
function generateId(prefix, list = []) {
  const next = list.length + 1;
  const padded = String(next).padStart(3, '0'); // Contoh: 001, 012, 100
  return `${prefix}-${padded}`;
}

// ------------------------------------------------------------
// TANGGAL & WAKTU
// ------------------------------------------------------------

/**
 * Mengembalikan waktu sekarang dalam format ISO 8601.
 * Contoh: "2025-01-15T09:30:00"
 * @returns {string}
 */
function getNow() {
  return new Date().toISOString().slice(0, 19);
}

/**
 * Memformat string ISO 8601 menjadi tampilan yang mudah dibaca.
 * Contoh: "2025-01-15T09:30:00" → "15 Jan 2025, 09:30"
 * @param  {string} isoString - Tanggal dalam format ISO 8601
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('id-ID', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ------------------------------------------------------------
// ENKODE PASSWORD (Base64)
// Bukan enkripsi sejati, hanya encoding dasar agar password
// tidak tersimpan sebagai teks biasa di LocalStorage
// ------------------------------------------------------------

/**
 * Mengubah password menjadi string Base64.
 * @param  {string} password - Password asli
 * @returns {string} Password yang sudah di-encode
 */
function encodePassword(password) {
  return btoa(password);
}

/**
 * Mengembalikan password dari Base64 ke teks asli.
 * @param  {string} encoded - Password yang sudah di-encode
 * @returns {string} Password asli
 */
function decodePassword(encoded) {
  return atob(encoded);
}

// ------------------------------------------------------------
// SEED DATA
// Daftar akun default yang harus selalu ada di sistem.
// Setiap entri diidentifikasi oleh id DAN username — keduanya
// harus unik. Akun yang sudah ada tidak akan ditimpa.
// ------------------------------------------------------------

/**
 * Daftar akun default yang wajib tersedia di sistem.
 * Tambahkan akun baru di sini; akun lama tidak akan terganggu.
 */
const DEFAULT_USERS = [
  {
    id:       'USR-001',
    name:     'Administrator',
    username: 'admin',
    password: encodePassword('admin123'),
    role:     'admin',
    isActive: true,
  },
  {
    id:       'USR-002',
    name:     'Budi Santoso',
    username: 'user1',
    password: encodePassword('user123'),
    role:     'user',
    isActive: true,
  },
  {
    id:       'USR-003',
    name:     'Muhammad Ghadafi',
    username: 'dapi1105',
    password: encodePassword('dapi110501'),
    role:     'user',
    isActive: true,
  },
];

/**
 * Memastikan semua akun default tersedia di LocalStorage.
 *
 * Perilaku:
 * - Jika hd_users belum ada → buat dari awal dengan semua akun default.
 * - Jika hd_users sudah ada → cek satu per satu; tambahkan hanya akun
 *   yang belum ada (berdasarkan id ATAU username). Akun yang sudah ada
 *   tidak diubah sama sekali.
 * - hd_tickets, hd_comments, dan hd_session tidak pernah ditimpa.
 */
function initSeedData() {
  const now         = getNow();
  const storedUsers = getFromStorage(STORAGE_KEYS.USERS, null);

  // ── Kasus 1: LocalStorage masih kosong — buat semua data awal ──
  if (storedUsers === null) {
    const freshUsers = DEFAULT_USERS.map(u => ({ ...u, createdAt: now }));
    saveToStorage(STORAGE_KEYS.USERS,    freshUsers);
    saveToStorage(STORAGE_KEYS.TICKETS,  []);
    saveToStorage(STORAGE_KEYS.COMMENTS, []);
    console.log('Seed data berhasil dibuat:', freshUsers.map(u => u.username));
    return;
  }

  // ── Kasus 2: Data sudah ada — periksa dan tambahkan yang belum ada ──
  let users   = storedUsers;         // Salin referensi array yang ada
  let changed = false;               // Tandai apakah ada yang ditambahkan

  DEFAULT_USERS.forEach(function (defaultUser) {
    // Cek apakah akun ini sudah ada berdasarkan id ATAU username
    const alreadyExists = users.some(function (u) {
      return u.id === defaultUser.id || u.username === defaultUser.username;
    });

    if (!alreadyExists) {
      // Belum ada → tambahkan dengan timestamp sekarang
      users.push({ ...defaultUser, createdAt: now });
      changed = true;
      console.log('Akun default ditambahkan:', defaultUser.username);
    }
  });

  // Hanya simpan ulang jika benar-benar ada perubahan
  if (changed) {
    saveToStorage(STORAGE_KEYS.USERS, users);
    console.log('hd_users diperbarui. Total akun:', users.length);
  }

  // Pastikan hd_tickets dan hd_comments ada (aman untuk dipanggil ulang)
  if (getFromStorage(STORAGE_KEYS.TICKETS, null) === null) {
    saveToStorage(STORAGE_KEYS.TICKETS, []);
  }
  if (getFromStorage(STORAGE_KEYS.COMMENTS, null) === null) {
    saveToStorage(STORAGE_KEYS.COMMENTS, []);
  }
}