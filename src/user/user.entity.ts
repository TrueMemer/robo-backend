import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import * as bcrypt from "bcrypt";

@Entity()
export class User {

	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	username: string;

	@Column()
	password: string;

	@Column()
	email: string;

	@Column({ default: false })
	verified: boolean;

	hashPassword() {
		this.password = bcrypt.hashSync(this.password, 8);
	}

	comparePasswordWithHash(passHash: string) {
		return bcrypt.compareSync(passHash, this.password);
	}
}