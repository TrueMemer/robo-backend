import { IsNotEmpty, Min, NotEquals } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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
    public id: string;

    @Column()
    @IsNotEmpty()
    public user_id: number;

    @Column()
    @IsNotEmpty()
    public currency: string;

    @Column({
        type: "enum",
        enum: TransactionType,
    })
    public type: TransactionType;

    @Column({ type: "float" })
    @IsNotEmpty()
    @NotEquals(0)
    @Min(0)
    public amount_usd: number;

    @Column({ type: "float" })
    public amount_currency: number;

    @Column()
    public receive_address: string;

    @Column({ default: TransactionStatus.PENDING })
    public status: TransactionStatus;

    @Column()
    public dateCreated: Date;

    @Column({ nullable: true })
    public dateDone: Date;

}
