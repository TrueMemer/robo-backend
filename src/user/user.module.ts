import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AuthModule } from '../auth/auth.module';
import { VerificationTokenService } from './verification-token/verification-token.service';
import { VerificationToken } from './verification-token/verification-token.entity';
import { MailModule } from '../mail/mail.module';
import { VerificationTokenModule } from './verification-token/verification-token.module';

@Module({
	imports: [TypeOrmModule.forFeature([User]), PassportModule, MailModule, VerificationTokenModule],
	providers: [UserService, JwtStrategy],
	controllers: [UserController],
	exports: [UserService]
})
export class UserModule {}
