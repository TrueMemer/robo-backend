import { PrimaryGeneratedColumn, Column, Entity } from "typeorm";


export enum VerificationTokenType {
	EMAIL_VERIFICATION
}

@Entity()
export class VerificationToken {

	@PrimaryGeneratedColumn()
	id: string;

	@Column()
	user_id: number;

	@Column()
	token: string;

	@Column('int')
	type: VerificationTokenType;

}