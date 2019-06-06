import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import { IsNotEmpty, Min } from "class-validator";

export enum DepositStatus {
    PENDING,
    WORKING,
    EXPIRED
}

@Entity()
export default class Deposit {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    @IsNotEmpty()
    user_id: number;

    @Column()
    transactionId: string;

    @Column({ type: "float" })
    @IsNotEmpty()
    @Min(1)
    amount: number;

    @Column({
        type: "enum",
        enum: DepositStatus,
    })
    status: DepositStatus;

    @Column()
    pendingEndTime: Date;

}