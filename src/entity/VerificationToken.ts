import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class VerificationToken {

    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public userId: number;

    @Column()
    public token: string;
}
