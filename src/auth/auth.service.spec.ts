import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';

jest.mock('fs');

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret-key-12345'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should allow register when no users exist, and then block subsequent registrations', async () => {
    // 1. Initially hasUsers should be false
    expect(service.hasUsers()).toBe(false);

    // 2. First registration should succeed
    const result = (await service.register('admin', 'Admin123!')) as {
      success: boolean;
      username: string;
    };
    expect(result.success).toBe(true);
    expect(result.username).toBe('admin');
    expect(service.hasUsers()).toBe(true);

    // 3. Second registration should fail with ForbiddenException
    await expect(service.register('admin2', 'Admin123!')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
