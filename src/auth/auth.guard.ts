import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Check API Key for external webhook / sending integrations
    const configuredApiKey = this.configService.get<string>('API_KEY');
    if (configuredApiKey) {
      // Check X-API-KEY header
      const xApiKey = request.headers['x-api-key'];
      if (xApiKey === configuredApiKey) {
        return true;
      }

      // Check ?key= query parameter
      const queryKey = request.query['key'];
      if (queryKey === configuredApiKey) {
        return true;
      }
    }

    // 2. Check Bearer Token (for both API Key or User Token)
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Check if token matches the configured API Key directly
      if (configuredApiKey && token === configuredApiKey) {
        return true;
      }

      // Otherwise, verify if it's a valid user session JWT token
      const decoded = this.authService.verifyToken(token);
      if (decoded) {
        request.user = decoded;
        return true;
      }
    }

    // If no users are registered yet, and API_KEY is not configured, we allow initial access
    // to dashboard status checks so that they can register the first account.
    // However, sending messages or doing critical actions should be protected.
    const hasUsers = this.authService.hasUsers();
    const isPublicInitRoute = request.url === '/api/whatsapp/status' || request.url.includes('/api/whatsapp/status');
    if (!hasUsers && !configuredApiKey && isPublicInitRoute) {
      return true;
    }

    throw new UnauthorizedException('Access denied. Valid Bearer Token or API Key required.');
  }
}
