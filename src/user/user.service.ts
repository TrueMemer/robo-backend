import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/createUser.dto';

@Injectable()
export class UserService {

	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>
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

		newUser = await this.userRepository.save(newUser);

		return newUser;

	}

}
