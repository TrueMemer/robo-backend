import { Module } from '@nestjs/common';
import { MailerModule } from '@nest-modules/mailer';
import { MailService } from './mail.service';
import { UserModule } from '../user/user.module';
import { VerificationTokenModule } from '../user/verification-token/verification-token.module';

@Module({
	imports: [
		MailerModule.forRoot({
			transport: process.env.MAIL_TRANSPORT_STRING,
			defaults: {
				from: "ROBO FX TRADING NOREPLY SERVICE <general@robofxtrading.net>"
			}
		}),
		VerificationTokenModule
	],
	providers: [MailService],
	exports: [MailService]
})
export class MailModule {}
