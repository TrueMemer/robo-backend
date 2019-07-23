import { Module } from '@nestjs/common';
import { VerificationTokenService } from './verification-token.service';
import { VerificationToken } from './verification-token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
	imports: [TypeOrmModule.forFeature([VerificationToken])],
	providers: [VerificationTokenService],
	exports: [VerificationTokenService]
})
export class VerificationTokenModule {}
