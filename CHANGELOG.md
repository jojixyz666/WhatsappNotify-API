# Changelog

All notable changes to **WA-Notify** (WhatsApp Notification Microservice) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-06-18

### 🎉 Initial Release

First production-ready release of WA-Notify — a self-hosted WhatsApp notification microservice built with NestJS and Baileys.

### Added

#### Core WhatsApp Service
- WhatsApp Web connection via **@whiskeysockets/baileys** (Multi-Device protocol).
- Persistent session management using multi-file auth state (`sessions/` directory).
- Automatic reconnection on unexpected disconnects.
- Session cleanup and re-initialization on logout.
- QR code generation as base64 Data URL for web-based pairing.
- QR code printed in terminal for convenience during headless setup.
- Smart phone number formatting with configurable default country code (`DEFAULT_COUNTRY_CODE`).

#### REST API Endpoints
- `GET /api/whatsapp/status` — Returns current connection state (`CONNECTED`, `CONNECTING`, `DISCONNECTED`, `SCAN_QR`).
- `POST /api/whatsapp/send` — Send a text message via JSON body with DTO validation (`to`, `message`).
- `GET /api/whatsapp/send` — Send a message via URL query parameters (`?to=...&message=...`), supporting `msg` as an alias for `message`. Falls back to `DEFAULT_RECIPIENT` env variable when `to` is omitted.
- `POST /api/whatsapp/webhook` — Generic webhook receiver that auto-parses payloads from third-party systems (Grafana, Uptime Kuma, Netdata, etc.). Supports common body keys: `to`, `phone`, `number`, `message`, `msg`, `text`, `body`, `content`, `title`.
- `GET /api/whatsapp/qr` — Returns the current QR code as a base64 Data URL.
- `POST /api/whatsapp/logout` — Clears session credentials and restarts the connection flow.

#### Web Dashboard (`public/index.html`)
- **Dashboard tab** — Real-time connection status, QR code display, session metrics (status, messages sent, last activity), and disconnect button.
- **Test Console tab** — Built-in form to send test messages with a live activity log.
- **API Reference tab** — Interactive documentation of all available endpoints with example payloads.
- Dark theme UI using Outfit & Plus Jakarta Sans fonts with Tabler Icons.
- Responsive design with mobile-friendly layout.
- Auto-polling: status check every 3 seconds, QR refresh every 5 seconds.
- Toast notifications for send success/failure.

#### Configuration (`.env`)
- `PORT` — Server port (default: `3000`).
- `WHATSAPP_SESSION_DIR` — Session storage directory (default: `sessions`).
- `DEFAULT_COUNTRY_CODE` — Phone number prefix for local numbers (default: `62` / Indonesia).
- `DEFAULT_RECIPIENT` — Fallback recipient for webhook and GET send endpoints.

#### Infrastructure
- **NestJS v11** application with modular architecture (`AppModule`, `WhatsappModule`).
- **CORS** enabled globally for cross-origin API access.
- **Static file serving** via `@nestjs/serve-static` for the web dashboard.
- **Global config** via `@nestjs/config` with `.env` support.
- Request validation using `class-validator` and `class-transformer`.
- Pino logger configured in silent mode to suppress Baileys verbose output.
- ESLint + Prettier for code formatting and linting.
- Jest configured for unit and e2e testing.
- TypeScript with strict compilation settings.
