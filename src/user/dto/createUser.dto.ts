import { IsNotEmpty, IsEmail } from "class-validator";

export class CreateUserDto {

	@IsNotEmpty()
	readonly username: string;

	@IsNotEmpty()
	readonly password: string;

	@IsEmail()
	readonly email: string;

}