// ======================================================
// app.js : mengatur tampilan dan interaksi pengguna
// ======================================================

const loginPanel   = document.getElementById("loginPanel");
const notesPanel   = document.getElementById("notesPanel");
const loginForm    = document.getElementById("loginForm");
const noteForm     = document.getElementById("noteForm");
const titleInput   = document.getElementById("title");
const contentInput = document.getElementById("content");
const saveButton   = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const logoutButton = document.getElementById("logoutButton");
const userName     = document.getElementById("userName");
const message      = document.getElementById("message");
const list         = document.getElementById("noteList");

document.getElementById("serverUrl").textContent = API_URL;

let notes = [];        // daftar catatan dari server
let editingId = null;  // null = mode tambah, angka = mode edit

function tampilPesan(result) {
  message.textContent = result.message;
  message.className = result.success ? "success" : "";
}

// ---------- Ganti tampilan: login <-> catatan ----------
function tampilLogin() {
  loginPanel.hidden = false;
  notesPanel.hidden = true;
}

function tampilCatatan() {
  loginPanel.hidden = true;
  notesPanel.hidden = false;
  userName.textContent = localStorage.getItem("name") || "";
}

// ---------- LOGIN ----------
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const result = await apiLogin(email, password);
  tampilPesan(result);

  if (result.success) {
    // Simpan token di browser. Dikirim lagi otomatis oleh interceptor di api.js.
    localStorage.setItem("token", result.data.token);
    localStorage.setItem("name", result.data.name);
    loginForm.reset();
    tampilCatatan();
    muat();
  }
});

// ---------- LOGOUT ----------
logoutButton.addEventListener("click", async () => {
  const result = await apiLogout();   // minta server mematikan token
  localStorage.removeItem("token");
  localStorage.removeItem("name");
  notes = [];
  resetForm();
  tampilLogin();
  tampilPesan(result);
});

// ---------- READ ----------
async function muat() {
  const result = await apiAmbil();

  if (result.success) {
    notes = result.data;
    tampilkan();
  } else {
    // Token tidak valid / sudah mati: kembali ke halaman login
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    tampilLogin();
    tampilPesan(result);
  }
}

// Gambar ulang daftar catatan.
// Pakai textContent (bukan innerHTML) supaya isi catatan tidak dijalankan sebagai HTML (XSS).
function tampilkan() {
  list.innerHTML = "";

  if (notes.length === 0) {
    const kosong = document.createElement("li");
    kosong.textContent = "Belum ada catatan. Isi formulir di atas untuk membuat yang pertama.";
    list.appendChild(kosong);
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement("li");

    const judul = document.createElement("h3");
    judul.textContent = note.title;

    const isi = document.createElement("p");
    isi.textContent = note.content || "";

    const aksi = document.createElement("div");
    aksi.className = "note-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => mulaiEdit(note));

    const hapusBtn = document.createElement("button");
    hapusBtn.type = "button";
    hapusBtn.className = "danger";
    hapusBtn.textContent = "Hapus";
    hapusBtn.addEventListener("click", () => hapusCatatan(note.id));

    aksi.append(editBtn, hapusBtn);
    li.append(judul, isi, aksi);
    list.appendChild(li);
  });
}

// ---------- Mode edit ----------
function mulaiEdit(note) {
  editingId = note.id;
  titleInput.value = note.title;
  contentInput.value = note.content || "";
  saveButton.textContent = "Perbarui catatan";
  cancelButton.hidden = false;
  titleInput.focus();
}

function resetForm() {
  editingId = null;
  noteForm.reset();
  saveButton.textContent = "Simpan catatan";
  cancelButton.hidden = true;
}

cancelButton.addEventListener("click", resetForm);

// ---------- CREATE atau UPDATE ----------
noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    content: contentInput.value.trim(),
  };

  const result = editingId === null
    ? await apiBuat(payload)             // POST /api/notes
    : await apiUbah(editingId, payload); // PUT  /api/notes/{id}

  tampilPesan(result);
  if (result.success) {
    resetForm();
    muat();
  }
});

// ---------- DELETE ----------
async function hapusCatatan(id) {
  if (!confirm("Hapus catatan ini?")) return;

  const result = await apiHapus(id);
  tampilPesan(result);
  if (result.success) muat();
}

// ---------- Saat halaman dibuka ----------
// Kalau token masih tersimpan, langsung tampilkan catatan.
if (localStorage.getItem("token")) {
  tampilCatatan();
  muat();
} else {
  tampilLogin();
}
