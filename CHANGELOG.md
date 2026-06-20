# Changelog

All notable changes to **WA-Notify** (WhatsApp Notification Microservice) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.1.0] — 2026-06-20

### Added

#### Authentication & Security
- **Admin Registration & Login**: Added endpoints (`POST /api/auth/register`, `POST /api/auth/login`) to register and authenticate administrator users.
- **Strict Password Policy**: Implemented server-side complexity checks requiring passwords to be at least 8 characters long, containing a mixture of uppercase, lowercase, numbers, and symbols.
- **HMAC Token Signing**: Custom JWT-like token generation using Node.js `crypto` with HMAC-SHA256 signature verification.
- **API Key Bypass**: Added support for an optional `API_KEY` configuration in `.env` to allow external automated integrations (like Grafana, Uptime Kuma) to bypass user token auth.
- **Local User Database**: Persisted admin credentials in `data/users.json` using scrypt hashing to survive container or WhatsApp session restarts.
- **Route Protection**: Secured all `/api/whatsapp` controller endpoints under a new global `AuthGuard`.
- **Single Admin Restriction**: Enforced a single administrator constraint. After the initial account is created, registration is permanently disabled on the backend and frontend for security.

#### UI & Frontend
- **Glassmorphic Login UI**: Added a premium glassmorphic overlay for logging in and registering.
- **Interactive Password Checklist**: Added real-time visual checklist tracking length, casing, numbers, and symbols requirements.
- **Session Logout**: Added a dashboard logout button to clear credentials from `localStorage`.
- **Auto Onboarding**: Implemented check for existing users (`GET /api/auth/status`) to prompt for admin setup on clean installations.

#### Deployment
- **Dockerfile**: Added production multi-stage build setup to containerize the application.

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
