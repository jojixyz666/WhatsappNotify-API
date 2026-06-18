import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import * as qrcode from 'qrcode';
import pino from 'pino';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private sock: WASocket | null = null;
  private qrCodeDataUrl: string | null = null;
  private connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'SCAN_QR' = 'DISCONNECTED';
  private sessionDir: string;

  constructor(private readonly configService: ConfigService) {
    this.sessionDir = this.configService.get<string>('WHATSAPP_SESSION_DIR') || 'sessions';
  }

  async onModuleInit() {
    this.connectToWhatsApp();
  }

  async onModuleDestroy() {
    if (this.sock) {
      this.sock.end(undefined);
    }
  }

  private async connectToWhatsApp() {
    try {
      const sessionPath = path.join(process.cwd(), this.sessionDir);
      
      // Ensure session directory exists
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      this.logger.log('Starting WhatsApp connection...');
      this.connectionStatus = 'CONNECTING';

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Also print to terminal for convenience
        logger: pino({ level: 'silent' }), // Disable Baileys verbose logger
        defaultQueryTimeoutMs: 60000,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.connectionStatus = 'SCAN_QR';
          try {
            this.qrCodeDataUrl = await qrcode.toDataURL(qr);
            this.logger.log('New QR Code generated. Scan via dashboard or terminal.');
          } catch (err) {
            this.logger.error('Failed to generate QR data URL', err);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          this.logger.warn(`Connection closed. Status code: ${statusCode}. Reconnecting: ${shouldReconnect}`);
          this.qrCodeDataUrl = null;
          this.connectionStatus = 'DISCONNECTED';

          if (shouldReconnect) {
            this.connectToWhatsApp();
          } else {
            this.logger.log('Logged out of WhatsApp. Cleaning up session data...');
            this.clearSessionData();
            this.connectToWhatsApp();
          }
        } else if (connection === 'connecting') {
          this.connectionStatus = 'CONNECTING';
          this.qrCodeDataUrl = null;
        } else if (connection === 'open') {
          this.connectionStatus = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.logger.log('WhatsApp connection established successfully!');
        }
      });
    } catch (error) {
      this.logger.error('Error in connectToWhatsApp', error);
      this.connectionStatus = 'DISCONNECTED';
      // Retry connection after 5 seconds
      setTimeout(() => this.connectToWhatsApp(), 5000);
    }
  }

  private clearSessionData() {
    const sessionPath = path.join(process.cwd(), this.sessionDir);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        this.logger.log('Session directory deleted successfully.');
      } catch (err) {
        this.logger.error('Failed to clear session directory', err);
      }
    }
  }

  async logout() {
    this.logger.log('Logging out from WhatsApp...');
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (err) {
        this.logger.warn('Error during socket logout (already logged out or disconnected)', err);
      }
    }
    this.clearSessionData();
    this.connectionStatus = 'DISCONNECTED';
    this.qrCodeDataUrl = null;
    // Reinitialize WhatsApp client to get a new QR code
    this.connectToWhatsApp();
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      isLoggedIn: this.connectionStatus === 'CONNECTED',
    };
  }

  getQrCode() {
    return {
      qr: this.qrCodeDataUrl,
    };
  }

  private formatNumber(to: string): string {
    let cleaned = to.replace(/\D/g, ''); // Remove non-digit characters
    const defaultCountry = this.configService.get<string>('DEFAULT_COUNTRY_CODE') || '62';

    // If starting with 0, replace with default country code
    if (cleaned.startsWith('0')) {
      cleaned = defaultCountry + cleaned.substring(1);
    }

    // If it doesn't start with country code and seems like a local number, prepend country code
    if (!cleaned.startsWith(defaultCountry) && cleaned.length < 12) {
      cleaned = defaultCountry + cleaned;
    }

    if (!cleaned.endsWith('@s.whatsapp.net')) {
      cleaned = `${cleaned}@s.whatsapp.net`;
    }

    return cleaned;
  }

  async sendMessage(to: string, message: string) {
    if (this.connectionStatus !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp client is not connected. Please scan the QR code first.');
    }

    const formattedTo = this.formatNumber(to);
    this.logger.log(`Sending message to ${formattedTo}...`);
    
    const response = await this.sock.sendMessage(formattedTo, { text: message });
    return {
      id: response?.key?.id,
      to: formattedTo,
      status: 'SENT',
    };
  }
}
