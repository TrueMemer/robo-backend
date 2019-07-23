import { Controller, UseGuards, Get, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';

@Controller('profile')
export class ProfileController {

	constructor(
		private readonly userService: UserService
	) {}

	@Get()
	async me(@Request() req) {

		return this.userService.findOneById(req.user.id);

	}

}
