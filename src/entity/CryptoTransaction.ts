import { Entity, PrimaryGeneratedColumn, Column, IsNull } from "typeorm";
import { IsNotEmpty, Min, NotEquals } from "class-validator";

export enum TransactionType {
    WITHDRAWAL,
    PAYIN
}

export enum TransactionStatus {
    DONE,
    FAILED,
    PENDING,
    EXPIRED
}

@Entity()
export default class CryptoTransaction {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    @IsNotEmpty()
    user_id: number;

    @Column()
    @IsNotEmpty()
    currency: string;

    @Column({
        type: "enum",
        enum: TransactionType,
    })
    type: TransactionType;

    @Column({ type: "float" })
    @IsNotEmpty()
    @NotEquals(0)
    @Min(0)
    amount_usd: number;

    @Column({ type: "float" })
    amount_currency: number;

    @Column()
    receive_address: string;

    @Column({ default: TransactionStatus.PENDING })
    status: TransactionStatus;

    @Column()
    dateCreated: Date;

    @Column({ nullable: true })
    dateDone: Date;

}