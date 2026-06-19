import { Injectable, Logger, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface User {
  username: string;
  passwordHash: string;
  createdAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dbPath: string;
  private users: Map<string, User> = new Map();
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.dbPath = path.join(process.cwd(), 'data', 'users.json');
    // Read secret from env, or generate a persistent/temporary fallback
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'fallback-secret-key-please-change';
    this.loadUsers();
  }

  private loadUsers() {
    try {
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        const userList: User[] = JSON.parse(fileContent);
        this.users.clear();
        for (const user of userList) {
          this.users.set(user.username.toLowerCase(), user);
        }
        this.logger.log(`Loaded ${this.users.size} users from local DB.`);
      } else {
        this.saveUsers();
      }
    } catch (error) {
      this.logger.error('Failed to load users from DB file', error);
    }
  }

  private saveUsers() {
    try {
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const userList = Array.from(this.users.values());
      fs.writeFileSync(this.dbPath, JSON.stringify(userList, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to save users to DB file', error);
    }
  }

  validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long.');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter.');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter.');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number.');
    }
    if (!/[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/]/.test(password)) {
      errors.push('Password must contain at least one symbol.');
    }
    return errors;
  }

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
  }

  async register(username: string, password: string): Promise<any> {
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      throw new BadRequestException('Username is required.');
    }

    if (this.users.has(normalizedUsername)) {
      throw new ConflictException('Username is already taken.');
    }

    const passwordErrors = this.validatePassword(password);
    if (passwordErrors.length > 0) {
      throw new BadRequestException(passwordErrors);
    }

    const passwordHash = this.hashPassword(password);
    const newUser: User = {
      username: username.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    this.users.set(normalizedUsername, newUser);
    this.saveUsers();
    this.logger.log(`User registered: ${newUser.username}`);

    return {
      success: true,
      message: 'Registration successful.',
      username: newUser.username,
    };
  }

  async login(username: string, password: string): Promise<{ access_token: string }> {
    const normalizedUsername = username.trim().toLowerCase();
    const user = this.users.get(normalizedUsername);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = this.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Token expires in 24 hours
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const token = this.generateToken({ username: user.username, expiresAt });

    return {
      access_token: token,
    };
  }

  private generateToken(payload: { username: string; expiresAt: number }): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  verifyToken(token: string): { username: string } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (payload.expiresAt < Date.now()) {
        return null; // Expired
      }
      return { username: payload.username };
    } catch {
      return null;
    }
  }

  hasUsers(): boolean {
    return this.users.size > 0;
  }
}
