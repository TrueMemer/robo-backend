import { IsNotEmpty, Min } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum DepositStatus {
    PENDING,
    WORKING,
    EXPIRED
}

@Entity()
export default class Deposit {

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
        enum: DepositStatus,
    })
    public status: DepositStatus;

    @Column()
    public pendingEndTime: Date;

}
