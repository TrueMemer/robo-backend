import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { CreateUserDto } from "./dto/createUser.dto";

@Controller('user')
export class UserController {

	constructor(
		private readonly userService: UserService
	) {}

	@Get("getAll")
	getAll(): Promise<User[]> {
		return this.userService.findAll();
	}

	@Post("")
	async create(@Body() createUserDto: CreateUserDto): Promise<User> {
		return this.userService.addUser(createUserDto);
	}	

}
