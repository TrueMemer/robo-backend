import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/createUser.dto';
import { MailService } from '../mail/mail.service';
import { VerificationTokenService } from './verification-token/verification-token.service';

@Injectable()
export class UserService {

	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly mailService: MailService,
		private readonly tokenRepository: VerificationTokenService
	) {}

	findAll(): Promise<User[]> {
		return this.userRepository.find();
	}

	findOneById(id: number): Promise<User | null> {
		return this.userRepository.findOne(id);
	}

	findOneByUsername(username: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { username } });
	}

	async addUser(createUserDto: CreateUserDto): Promise<User> {

		const { username, password, email } = createUserDto;

		let newUser: User = new User();
		newUser.username = username;
		newUser.password = password;
		newUser.email = email;
		newUser.hashPassword();

		newUser = await this.userRepository.save(newUser);

		this.mailService.sendConfirmationEmail(newUser.id, newUser.email);

		return newUser;

	}

	async verifyUser(token: string) : Promise<boolean> {
		let t = await this.tokenRepository.getEmailTokenByToken(token);

		if (!t) {
			return false;
		}

		this.tokenRepository.removeTokenById(t.id);

		const user = await this.userRepository.findOne(t.user_id);

		if (!user) {
			return false;
		}

		user.verified = true;

		await this.userRepository.save(user);

		return true;
	}

}
