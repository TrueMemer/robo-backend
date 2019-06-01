import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class VerificationToken {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    token: string;
}
