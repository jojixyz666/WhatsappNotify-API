<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="80" alt="WhatsApp Logo" />
</p>

<h1 align="center">WA-Notify</h1>

<p align="center">
  Self-hosted WhatsApp Notification Microservice — kirim notifikasi WhatsApp dari sistem apapun via REST API.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-v11-ea2845?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Baileys-v7-25D366?logo=whatsapp&logoColor=white" alt="Baileys" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" alt="License" />
</p>

---

## 📖 Tentang Project

**WA-Notify** adalah microservice WhatsApp notification yang berjalan secara self-hosted. Project ini memungkinkan kamu mengirim pesan WhatsApp secara otomatis melalui REST API — cocok untuk integrasi dengan sistem monitoring (Grafana, Uptime Kuma, Netdata), CI/CD pipeline, IoT devices, cron jobs, atau aplikasi apapun yang bisa melakukan HTTP request.

Microservice ini menggunakan protokol **WhatsApp Multi-Device** melalui library [Baileys](https://github.com/WhiskeySockets/Baileys), sehingga **tidak memerlukan WhatsApp Business API berbayar**. Cukup scan QR code dengan akun WhatsApp pribadi, dan microservice siap digunakan.

### Fitur Utama

- 🔗 **WhatsApp Multi-Device** — Terhubung ke WhatsApp tanpa perlu HP selalu online.
- 📡 **REST API** — Kirim pesan via `POST` (JSON body) atau `GET` (query string).
- 🪝 **Webhook Receiver** — Terima alert dari Grafana, Uptime Kuma, Netdata, dll secara otomatis.
- 🖥️ **Web Dashboard** — Kelola koneksi, scan QR, kirim test message, dan lihat API docs langsung dari browser.
- 🔄 **Auto-Reconnect** — Koneksi otomatis pulih jika terputus.
- 💾 **Persistent Session** — Session tersimpan di disk, tidak perlu scan QR ulang setiap restart.
- 📱 **Smart Number Format** — Otomatis format nomor lokal ke format internasional.

---

## 🛠️ Tech Stack

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Runtime** | [Node.js](https://nodejs.org/) ≥ 18 | JavaScript runtime |
| **Framework** | [NestJS](https://nestjs.com/) v11 | Backend framework modular & scalable |
| **Language** | [TypeScript](https://www.typescriptlang.org/) 5.x | Static typing untuk JavaScript |
| **WhatsApp Client** | [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) v7 | WhatsApp Web API (Multi-Device) |
| **QR Code** | [qrcode](https://www.npmjs.com/package/qrcode) | Generate QR code sebagai base64 Data URL |
| **Logger** | [Pino](https://getpino.io/) | High-performance JSON logger |
| **Validation** | [class-validator](https://github.com/typestack/class-validator) + [class-transformer](https://github.com/typestack/class-transformer) | DTO request validation |
| **Config** | [@nestjs/config](https://docs.nestjs.com/techniques/configuration) | Environment variable management |
| **Static Files** | [@nestjs/serve-static](https://docs.nestjs.com/recipes/serve-static) | Serve web dashboard |
| **Linting** | [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) | Code formatting & linting |
| **Testing** | [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) | Unit & e2e testing |

---

## 🚀 Installation

### Prerequisites

- **Node.js** ≥ 18 ([download](https://nodejs.org/))
- **npm** ≥ 9 (sudah termasuk dengan Node.js)
- Akun **WhatsApp** aktif di smartphone

### 1. Clone Repository

```bash
git clone https://github.com/jojixyz666/WhatsappNotify-API.git
cd WhatsappNotify-API
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Salin file `.env.example` atau buat file `.env` di root project:

```env
PORT=3000
WHATSAPP_SESSION_DIR=sessions
DEFAULT_COUNTRY_CODE=62
DEFAULT_RECIPIENT=
```

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port server |
| `WHATSAPP_SESSION_DIR` | `sessions` | Direktori penyimpanan session WhatsApp |
| `DEFAULT_COUNTRY_CODE` | `62` | Kode negara default (62 = Indonesia) |
| `DEFAULT_RECIPIENT` | _(kosong)_ | Nomor tujuan default untuk webhook & GET send (opsional) |

### 4. Jalankan Server

```bash
# Development (auto-reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 5. Scan QR Code

Setelah server berjalan:

1. Buka browser → `http://localhost:3000`
2. Atau lihat QR code di terminal
3. Buka **WhatsApp** di HP → **Linked Devices** → **Link a Device**
4. Scan QR code
5. Status berubah menjadi **Connected** ✅

> **Catatan:** Session tersimpan di folder `sessions/`. Selama folder ini tidak dihapus, kamu tidak perlu scan QR lagi setelah restart server.

---

## 📡 API Reference

Base URL: `http://localhost:3000`

### Cek Status Koneksi

```http
GET /api/whatsapp/status
```

**Response:**
```json
{
  "status": "CONNECTED",
  "isLoggedIn": true
}
```

Status yang mungkin: `CONNECTED`, `CONNECTING`, `DISCONNECTED`, `SCAN_QR`

---

### Kirim Pesan (POST)

```http
POST /api/whatsapp/send
Content-Type: application/json
```

**Body:**
```json
{
  "to": "628123456789",
  "message": "Hello from WA-Notify! 🚀"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message queued/sent successfully",
  "data": {
    "id": "ABCDEF123456",
    "to": "628123456789@s.whatsapp.net",
    "status": "SENT"
  }
}
```

---

### Kirim Pesan (GET)

```http
GET /api/whatsapp/send?to=628123456789&message=Hello+World
```

Cocok untuk integrasi sederhana, browser redirect, atau webhook tanpa body.

| Parameter | Wajib | Keterangan |
|---|---|---|
| `to` | Tidak* | Nomor tujuan. Jika kosong, gunakan `DEFAULT_RECIPIENT` dari `.env` |
| `message` atau `msg` | Ya | Isi pesan |

---

### Webhook Receiver

```http
POST /api/whatsapp/webhook?to=628123456789
Content-Type: application/json
```

Endpoint ini otomatis mem-parsing payload dari berbagai sistem monitoring. Mendukung body keys:

- `message`, `msg`, `text`, `body`, `content` — untuk isi pesan
- `to`, `phone`, `number` — untuk nomor tujuan
- `title` — digabung dengan `message` jika ada

Jika `to` tidak ditemukan di body maupun query, akan fallback ke `DEFAULT_RECIPIENT`.

**Contoh: Uptime Kuma**
```json
{
  "msg": "🔴 Server Production DOWN!",
  "to": "628123456789"
}
```

**Contoh: Grafana Alert**
```json
{
  "title": "High CPU Usage",
  "message": "CPU usage exceeded 90% on server-01"
}
```

---

### Ambil QR Code

```http
GET /api/whatsapp/qr
```

**Response (saat status SCAN_QR):**
```json
{
  "qr": "data:image/png;base64,..."
}
```

---

### Logout / Disconnect

```http
POST /api/whatsapp/logout
```

Menghapus session dan memulai ulang flow koneksi (QR baru akan di-generate).

---

## 🖥️ Web Dashboard

Akses dashboard di `http://localhost:3000` setelah server berjalan.

| Tab | Fungsi |
|---|---|
| **Dashboard** | Status koneksi real-time, QR code display, session metrics, tombol disconnect |
| **Test Console** | Form kirim pesan test dengan activity log |
| **API Reference** | Dokumentasi endpoint lengkap dengan contoh payload |

Dashboard menggunakan dark theme dengan auto-polling (status setiap 3 detik, QR setiap 5 detik).

---

## 📂 Project Structure

```
WhatsappNotify-API/
├── public/
│   └── index.html            # Web dashboard (single-page)
├── sessions/                  # WhatsApp session data (auto-generated, gitignored)
├── src/
│   ├── main.ts                # Application entry point
│   ├── app.module.ts          # Root module (config, static files, whatsapp)
│   ├── app.controller.ts      # Root controller
│   ├── app.service.ts         # Root service
│   └── whatsapp/
│       ├── whatsapp.module.ts     # WhatsApp feature module
│       ├── whatsapp.controller.ts # REST API endpoints & DTO validation
│       └── whatsapp.service.ts    # Baileys connection, QR, send logic
├── test/                      # E2e test files
├── .env                       # Environment variables (gitignored)
├── .gitignore
├── .prettierrc
├── CHANGELOG.md
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## 📜 Scripts

| Command | Keterangan |
|---|---|
| `npm run start` | Jalankan server |
| `npm run start:dev` | Jalankan server dengan auto-reload (watch mode) |
| `npm run start:debug` | Jalankan server dengan debugger |
| `npm run start:prod` | Jalankan build production |
| `npm run build` | Compile TypeScript ke JavaScript |
| `npm run lint` | Jalankan ESLint |
| `npm run format` | Format kode dengan Prettier |
| `npm run test` | Jalankan unit tests |
| `npm run test:e2e` | Jalankan end-to-end tests |
| `npm run test:cov` | Jalankan tests dengan coverage report |

---

## 🤝 Integrasi

WA-Notify dirancang untuk mudah diintegrasikan dengan berbagai sistem:

- **Uptime Kuma** — Tambahkan notification type "Webhook" dengan URL `http://server:3000/api/whatsapp/webhook?to=628xxx`
- **Grafana** — Gunakan contact point "Webhook" ke endpoint webhook
- **Netdata** — Konfigurasi alarm notification via webhook
- **Cron Job** — Panggil endpoint GET dari crontab: `curl "http://localhost:3000/api/whatsapp/send?to=628xxx&msg=Backup+selesai"`
- **Custom App** — HTTP POST ke `/api/whatsapp/send` dari bahasa pemrograman apapun

---

## ⚠️ Disclaimer

Project ini menggunakan library tidak resmi untuk berkomunikasi dengan WhatsApp. Penggunaan di luar ketentuan layanan WhatsApp menjadi tanggung jawab pengguna. Disarankan untuk menggunakan akun WhatsApp yang didedikasikan khusus untuk notifikasi.
