import { IsNotEmpty, Min } from "class-validator";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum WithdrawalType {
    WITHDRAW,
    REINVEST
}

export enum WithdrawalStatus {
    PENDING,
    DONE
}

@Entity()
export default class Withdrawal {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    @IsNotEmpty()
    public user_id: number;

    @Column()
    public transactionId: string;

    @Column({ type: "float" })
    @IsNotEmpty()
    @Min(1)
    public amount: number;

    @Column({
        type: "enum",
        enum: WithdrawalType,
        default: WithdrawalType.WITHDRAW
    })
    public type: WithdrawalType;

    @Column({
        type: "enum",
        enum: WithdrawalStatus
    })
    public status: WithdrawalStatus;

    @CreateDateColumn()
    public created: Date;
}
