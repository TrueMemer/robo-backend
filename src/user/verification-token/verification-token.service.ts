import { Injectable, ValidationError } from '@nestjs/common';
import { UserService } from '../user.service';
import { Repository } from 'typeorm';
import { VerificationToken, VerificationTokenType } from './verification-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateVerificationTokenDto } from './dto/CreateVerificationToken.dto';
import { validate } from 'class-validator';
import * as crypto from "crypto";

@Injectable()
export class VerificationTokenService {

	constructor(
		@InjectRepository(VerificationToken)
		private tokenRepository: Repository<VerificationToken>
	) {}

	async findOneById(id: string) : Promise<VerificationToken | null> {
		return this.tokenRepository.findOne(id);
	}

	async createToken(dto: CreateVerificationTokenDto) : Promise<VerificationToken | null> {

		const errors = await validate(dto);
		if (errors.length > 0) {
			return null;
		}

		let token = new VerificationToken();
		token.user_id = dto.user_id;
		token.type = dto.type;
		token.token = crypto.randomBytes(16).toString("hex");

		token = await this.tokenRepository.save(token);

		return token;

	}

	async getEmailTokenByUserId(id: number) : Promise<VerificationToken | null> {
		return this.tokenRepository.findOne({ where: { user_id: id, type: VerificationTokenType.EMAIL_VERIFICATION }});
	}

	async getEmailTokenByToken(token: string) : Promise<VerificationToken | null> {
		return this.tokenRepository.findOne({ where: { token, type: VerificationTokenType.EMAIL_VERIFICATION }});
	}

	async removeTokenById(id: string) {
		this.tokenRepository.delete({ id });
	}

}
