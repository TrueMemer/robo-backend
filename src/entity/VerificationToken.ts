import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum VerificationTokenType {
    EMAIL,
    WITHDRAW,
    REINVEST
}

@Entity()
export class VerificationToken {

    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public userId: number;

    @Column()
    public token: string;

    @Column({
        type: "enum",
        enum: VerificationTokenType,
        default: VerificationTokenType.EMAIL
    })
    public type: VerificationTokenType;

    @Column({ nullable: true })
    public transaction_id: string;

}
