import { Controller, Get, Post, Body, Query, HttpException, HttpStatus, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';

export class SendMessageDto {
  @IsNotEmpty({ message: 'Recipient number (to) is required' })
  @IsString({ message: 'Recipient number (to) must be a string' })
  to: string;

  @IsNotEmpty({ message: 'Message content (message) is required' })
  @IsString({ message: 'Message content (message) must be a string' })
  message: string;
}

@Controller('api/whatsapp')
@UseGuards(AuthGuard)
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('qr')
  getQr() {
    const qrData = this.whatsappService.getQrCode();
    if (!qrData.qr) {
      return {
        qr: null,
        message: 'No QR code available. Client might be connected or initializing.',
      };
    }
    return qrData;
  }

  @Post('send')
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    try {
      const result = await this.whatsappService.sendMessage(
        sendMessageDto.to,
        sendMessageDto.message,
      );
      return {
        success: true,
        message: 'Message queued/sent successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to send WhatsApp message',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * GET /api/whatsapp/send
   * Universal sending endpoint using URL query parameters.
   * Useful for legacy systems, browser redirects, simple webhooks, or simple HTTP clients.
   */
  @Get('send')
  async sendMessageGet(
    @Query('to') to?: string,
    @Query('message') message?: string,
    @Query('msg') msg?: string,
  ) {
    const recipient = to || this.configService.get<string>('DEFAULT_RECIPIENT');
    const textContent = message || msg;

    if (!recipient) {
      throw new HttpException(
        {
          success: false,
          error: 'Recipient number (to) query parameter is required (or set DEFAULT_RECIPIENT in .env)',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!textContent) {
      throw new HttpException(
        {
          success: false,
          error: 'Message text is required via "message" or "msg" query parameter',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.whatsappService.sendMessage(recipient, textContent);
      return {
        success: true,
        message: 'Message queued/sent successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to send WhatsApp message',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /api/whatsapp/webhook
   * Generic adapter for third-party webhook systems (e.g. Grafana, Uptime Kuma, Netdata).
   * Automatically attempts to parse message contents from typical payload structures.
   */
  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Query('to') queryTo?: string,
  ) {
    const to = queryTo || body?.to || body?.phone || body?.number || this.configService.get<string>('DEFAULT_RECIPIENT');

    if (!to) {
      throw new HttpException(
        {
          success: false,
          error: 'Recipient number (to) is required. Provide it as query param (?to=...), inside body JSON, or set DEFAULT_RECIPIENT in .env.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Try parsing message from common fields
    let message = '';
    if (typeof body === 'string') {
      message = body;
    } else if (body) {
      // Common alert keys (message, msg, text, body, content, or for Grafana: title/message/commonAnnotations)
      message = body.message || body.msg || body.text || body.body || body.content || 
                (body.title ? `${body.title}\n${body.message || ''}` : null) ||
                JSON.stringify(body);
    }

    if (!message) {
      throw new HttpException(
        {
          success: false,
          error: 'Could not extract message content from webhook body',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.whatsappService.sendMessage(to, message);
      return {
        success: true,
        message: 'Webhook message sent successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to send webhook WhatsApp message',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('logout')
  async logout() {
    try {
      await this.whatsappService.logout();
      return {
        success: true,
        message: 'Logged out successfully, session cleared and connection re-initialized.',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to logout from WhatsApp',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
