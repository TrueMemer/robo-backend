import { Injectable } from '@nestjs/common';
import { MailerService } from '@nest-modules/mailer';
import { User } from 'src/user/user.entity';
import { VerificationTokenService } from '../user/verification-token/verification-token.service';
import { VerificationTokenType } from '../user/verification-token/verification-token.entity';

@Injectable()
export class MailService {

	constructor(
		private readonly mailerService: MailerService,
		private readonly tokenService: VerificationTokenService
	) {}

	async sendConfirmationEmail(user_id: number, email: string) {

		let token = await this.tokenService.getEmailTokenByUserId(user_id);
		if (!token) {
			console.log(user_id)
			token = await this.tokenService.createToken({ user_id, type: VerificationTokenType.EMAIL_VERIFICATION });
		}

		this.mailerService.sendMail({
			to: email,
			from: 'general@robofxtrading.net',
			subject: 'Подтверждение почты',
			text: `Пожалуйста перейдите по ссылке для подтверждения аккаунта: http://robofxtrading.net/confirmation/${email}/${token.token} .`
		});

		return;

	}

}
