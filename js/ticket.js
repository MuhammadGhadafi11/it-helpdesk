// ============================================================
// ticket.js
// Logika untuk fitur tiket: membuat, membaca, dan menyimpan tiket
// Bergantung pada: utils.js dan auth.js
// ============================================================

// ------------------------------------------------------------
// KONSTANTA
// Nilai-nilai tetap yang dipakai di beberapa tempat
// ------------------------------------------------------------

// Daftar status tiket yang valid beserta urutan alurnya
const TICKET_STATUS = {
  OPEN:        'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED:    'Resolved',
  CLOSED:      'Closed',
};

// Daftar kategori yang tersedia
const TICKET_CATEGORIES = ['Hardware', 'Software', 'Network', 'Account', 'Other'];

// Daftar prioritas yang tersedia
const TICKET_PRIORITIES = ['Low', 'Medium', 'High'];

// ------------------------------------------------------------
// VALIDASI FORM
// Memeriksa setiap field dan menampilkan pesan error jika kosong
// ------------------------------------------------------------

/**
 * Menampilkan pesan error di bawah satu field form.
 * @param {string} fieldId   - ID elemen input
 * @param {string} message   - Pesan error yang akan ditampilkan
 */
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);

  if (field) field.classList.add('input-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

/**
 * Menghapus pesan error dari satu field form.
 * @param {string} fieldId - ID elemen input
 */
function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);

  if (field) field.classList.remove('input-error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
}

/**
 * Memvalidasi seluruh field form tiket.
 * Mengembalikan true jika semua valid, false jika ada yang kosong.
 * @returns {boolean}
 */
function validateTicketForm() {
  // Tandai apakah ada error (false = ada error)
  let isValid = true;

  // Ambil nilai setiap field
  const title       = document.getElementById('field-title').value.trim();
  const description = document.getElementById('field-description').value.trim();
  const category    = document.getElementById('field-category').value;
  const priority    = document.getElementById('field-priority').value;

  // Bersihkan semua error lama sebelum validasi ulang
  ['field-title', 'field-description', 'field-category', 'field-priority'].forEach(clearFieldError);

  // Validasi judul
  if (!title) {
    showFieldError('field-title', 'Judul masalah tidak boleh kosong.');
    isValid = false;
  } else if (title.length < 5) {
    showFieldError('field-title', 'Judul terlalu singkat, minimal 5 karakter.');
    isValid = false;
  }

  // Validasi deskripsi
  if (!description) {
    showFieldError('field-description', 'Deskripsi masalah tidak boleh kosong.');
    isValid = false;
  } else if (description.length < 10) {
    showFieldError('field-description', 'Deskripsi terlalu singkat, minimal 10 karakter.');
    isValid = false;
  }

  // Validasi kategori (nilai awal adalah string kosong "")
  if (!category) {
    showFieldError('field-category', 'Pilih kategori masalah.');
    isValid = false;
  }

  // Validasi prioritas
  if (!priority) {
    showFieldError('field-priority', 'Pilih tingkat prioritas.');
    isValid = false;
  }

  return isValid;
}

// ------------------------------------------------------------
// SIMPAN TIKET
// Membuat objek tiket baru dan menyimpannya ke LocalStorage
// ------------------------------------------------------------

/**
 * Membuat dan menyimpan tiket baru ke LocalStorage.
 * Mengikuti struktur data yang sudah disepakati di Data Model.
 * @returns {Object} Objek tiket yang baru dibuat
 */
function saveNewTicket() {
  // Ambil data session user yang sedang login
  const session = getSession();

  // Ambil nilai dari form
  const title       = document.getElementById('field-title').value.trim();
  const description = document.getElementById('field-description').value.trim();
  const category    = document.getElementById('field-category').value;
  const priority    = document.getElementById('field-priority').value;

  // Ambil semua tiket yang sudah ada dari LocalStorage
  const tickets = getFromStorage(STORAGE_KEYS.TICKETS, []);

  // Buat waktu sekarang (dipakai untuk createdAt dan updatedAt)
  const now = getNow();

  // Buat objek tiket baru sesuai Data Model yang sudah disepakati
  const newTicket = {
    id:            generateId('TKT', tickets), // Contoh: TKT-001, TKT-002
    title:         title,
    description:   description,
    category:      category,
    priority:      priority,
    status:        TICKET_STATUS.OPEN,         // Status awal selalu 'Open' (BR-07)
    createdBy:     session.id,                 // ID user yang membuat tiket
    createdByName: session.name,               // Nama user (disimpan langsung untuk kemudahan tampil)
    createdAt:     now,
    updatedAt:     now,
  };

  // Tambahkan tiket baru ke array tiket yang sudah ada
  tickets.push(newTicket);

  // Simpan kembali array tiket yang sudah diperbarui ke LocalStorage
  saveToStorage(STORAGE_KEYS.TICKETS, tickets);

  return newTicket;
}

// ------------------------------------------------------------
// TAMPILKAN NOTIFIKASI SUKSES
// Menampilkan pesan berhasil setelah tiket tersimpan
// ------------------------------------------------------------

/**
 * Menampilkan banner sukses di atas form dan mengganti teks tombol.
 * @param {string} ticketId - ID tiket yang baru dibuat (untuk ditampilkan)
 */
function showSuccessNotification(ticketId) {
  const successEl   = document.getElementById('success-message');
  const successText = document.getElementById('success-text');
  const submitBtn   = document.getElementById('btn-submit');
  const form        = document.getElementById('ticket-form');

  // Tampilkan banner hijau sukses
  if (successEl && successText) {
    successText.textContent = `Tiket ${ticketId} berhasil dibuat! Mengarahkan ke halaman Tiket Saya...`;
    successEl.style.display = 'flex';
  }

  // Nonaktifkan tombol submit agar tidak bisa diklik dua kali
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Tiket Berhasil Dikirim';
  }

  // Nonaktifkan seluruh input form
  if (form) {
    const inputs = form.querySelectorAll('input, textarea, select, button');
    inputs.forEach(el => { el.disabled = true; });
  }
}

// ------------------------------------------------------------
// HANDLER SUBMIT FORM
// Fungsi utama yang dipanggil saat tombol "Kirim Tiket" ditekan
// ------------------------------------------------------------

/**
 * Memproses pengiriman form tiket.
 * Alur: validasi → simpan → notifikasi → redirect
 * @param {Event} event - Event submit dari form
 */
function handleTicketSubmit(event) {
  // Mencegah form melakukan reload halaman
  event.preventDefault();

  // Langkah 1: Validasi semua field
  const isValid = validateTicketForm();
  if (!isValid) return; // Hentikan jika ada field yang tidak valid

  // Langkah 2: Simpan tiket baru ke LocalStorage
  const newTicket = saveNewTicket();

  // Langkah 3: Tampilkan notifikasi sukses
  showSuccessNotification(newTicket.id);

  // Langkah 4: Setelah 2 detik, arahkan ke halaman Tiket Saya
  setTimeout(function () {
    window.location.href = 'my-tickets.html';
  }, 2000);
}

// ------------------------------------------------------------
// PASANG LISTENER HAPUS ERROR SAAT MENGETIK
// Saat user mulai mengisi field yang error, error langsung hilang
// ------------------------------------------------------------

/**
 * Memasang event listener "input" / "change" pada setiap field form
 * agar pesan error otomatis hilang saat user mulai mengisi ulang.
 */
function attachClearErrorListeners() {
  const fields = [
    { id: 'field-title',       event: 'input'  },
    { id: 'field-description', event: 'input'  },
    { id: 'field-category',    event: 'change' },
    { id: 'field-priority',    event: 'change' },
  ];

  fields.forEach(({ id, event }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(event, () => clearFieldError(id));
    }
  });
}

// ------------------------------------------------------------
// INISIALISASI HALAMAN CREATE TICKET
// Dipanggil saat halaman create-ticket.html selesai dimuat
// ------------------------------------------------------------

/**
 * Menginisialisasi halaman Buat Tiket.
 * Urutan kerja:
 * 1. Proteksi halaman (wajib login sebagai 'user')
 * 2. Tampilkan info user di sidebar
 * 3. Pasang event listener pada form
 * 4. Pasang event listener hapus error
 * 5. Pasang event logout
 */
function initCreateTicketPage() {
  // 1. Proteksi halaman: hanya role 'user' yang boleh masuk
  requireLogin('user');

  // 2. Ambil data sesi user yang sedang login
  const session = getSession();
  if (!session) return;

  // 3. Tampilkan nama user di sidebar
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarRole = document.getElementById('sidebar-user-role');
  if (sidebarName) sidebarName.textContent = session.name;
  if (sidebarRole) sidebarRole.textContent = 'User';

  // 4. Pasang event submit pada form tiket
  const ticketForm = document.getElementById('ticket-form');
  if (ticketForm) {
    ticketForm.addEventListener('submit', handleTicketSubmit);
  }

  // 5. Pasang event hapus error saat user mengetik
  attachClearErrorListeners();

  // 6. Pasang event logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// ------------------------------------------------------------
// JALANKAN SAAT DOM SIAP
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initCreateTicketPage);
