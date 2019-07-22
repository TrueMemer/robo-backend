import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserLoginDto } from './dto/userLogin.dto';
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {

	constructor(
		private readonly userService: UserService,
		private readonly jwtService: JwtService
	) {}

	async validateUser(userLoginDto: UserLoginDto) {

		const { username, password } = userLoginDto;

		const user = await this.userService.findOneByUsername(username);

		if (user && user.password === password) {
			const { password, ...result } = user;
      		return result;
		}

		return null;
	}

	async login(user: any) {
		const payload = { username: user.username, sub: user.id };

		return {
			token: this.jwtService.sign(payload)
		};
	}

}
