// ======================================================
// api.js : semua urusan bicara dengan server PHP
// ======================================================

// Alamat server PHP. Ganti kalau port/alamatnya berbeda.
//  - Browser di laptop yang sama : http://localhost:8000
const API_URL = "https://generic-suitable-wars-factors.trycloudflare.com";

// Buat "klien" axios dengan pengaturan dasar.
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ---------- Interceptor request ----------
// Dijalankan OTOMATIS sebelum setiap request dikirim.
// Tugasnya: kalau ada token, tempelkan ke header Authorization.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

// ---------- Interceptor response ----------
// Dijalankan OTOMATIS setiap kali balasan datang (sukses maupun error).
// Di sini kita hanya mencatat ke panel log supaya mahasiswa bisa melihatnya.
api.interceptors.response.use(
  (response) => {
    catatLog(response.config, response.status, response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server membalas, tapi dengan status 4xx / 5xx
      catatLog(error.config, error.response.status, error.response.data);
    } else {
      // Server tidak terjangkau sama sekali
      catatLog(error.config, 0, { error: "Tidak ada balasan dari server" });
    }
    return Promise.reject(error);
  },
);

// ---------- Fungsi dasar ----------
// Axios menganggap status 4xx/5xx sebagai error. Server kita tetap mengirim
// JSON berisi "message", jadi pesan itu yang dikembalikan ke halaman.
async function panggil(method, url, data) {
  try {
    const response = await api({ method, url, data });
    return response.data;
  } catch (error) {
    const body = error.response && error.response.data;
    if (body && typeof body === "object" && body.message) {
      return body;
    }
    return {
      success: false,
      message: "Tidak dapat terhubung ke server. Pastikan PHP berjalan di " + API_URL,
    };
  }
}

// ---------- Satu fungsi untuk satu endpoint ----------
const apiLogin = (email, password) => panggil("post", "/api/login", { email, password });
const apiLogout = () => panggil("post", "/api/logout");
const apiAmbil = () => panggil("get", "/api/notes"); // Read
const apiBuat = (payload) => panggil("post", "/api/notes", payload); // Create
const apiUbah = (id, payload) => panggil("put", "/api/notes/" + id, payload); // Update
const apiHapus = (id) => panggil("delete", "/api/notes/" + id); // Delete

// ---------- Panel log (hanya untuk keperluan belajar) ----------
const NAMA_STATUS = {
  0: "Tidak terhubung",
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  422: "Unprocessable",
  500: "Server Error",
};

function buatBaris(label, isi) {
  const wrap = document.createElement("div");
  const l = document.createElement("div");
  l.className = "label";
  l.textContent = label;
  const pre = document.createElement("pre");
  pre.textContent = isi;
  wrap.append(l, pre);
  return wrap;
}

function catatLog(config, status, data) {
  const list = document.getElementById("logList");
  if (!list) return;

  const method = (config.method || "").toUpperCase();
  const entry = document.createElement("div");
  entry.className = "entry";

  // Baris judul: METHOD /url  200 OK
  const line = document.createElement("div");
  line.className = "line";
  const m = document.createElement("span");
  m.className = "method";
  m.textContent = method;
  const u = document.createElement("span");
  u.className = "url";
  u.textContent = config.url;
  const s = document.createElement("span");
  s.className = "status s" + Math.floor(status / 100);
  s.textContent = status + " " + (NAMA_STATUS[status] || "");
  line.append(m, u, s);
  entry.appendChild(line);

  // Header Authorization (token dipotong supaya tidak panjang)
  const auth = config.headers && config.headers.Authorization;
  if (auth) {
    entry.appendChild(buatBaris("Header", "Authorization: " + auth.slice(0, 22) + "..."));
  }

  // Body yang dikirim (kalau ada). Password disamarkan.
  if (config.data) {
    let tampil = config.data;
    try {
      const obj = JSON.parse(config.data);
      if (obj.password) obj.password = "******";
      tampil = JSON.stringify(obj, null, 2);
    } catch (e) {
      /* biarkan apa adanya */
    }
    entry.appendChild(buatBaris("Body dikirim", tampil));
  }

  // Balasan dari server (token disingkat supaya mudah dibaca)
  let balasan = data;
  if (data && data.data && data.data.token) {
    balasan = JSON.parse(JSON.stringify(data));
    balasan.data.token = balasan.data.token.slice(0, 12) + "...";
  }
  entry.appendChild(buatBaris("Balasan", JSON.stringify(balasan, null, 2)));

  // Yang terbaru di paling atas, simpan maksimal 10 catatan
  list.prepend(entry);
  while (list.children.length > 10) list.removeChild(list.lastChild);
}
