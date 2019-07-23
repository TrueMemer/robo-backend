import { Test, TestingModule } from '@nestjs/testing';
import { VerificationTokenService } from './verification-token.service';

describe('VerificationTokenService', () => {
  let service: VerificationTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerificationTokenService],
    }).compile();

    service = module.get<VerificationTokenService>(VerificationTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
