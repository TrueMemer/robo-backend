import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum ProfitType {
    ORDERS,
    REFERRALS,
    BONUS,
    OTHER,
    DEPOSIT_RETURN
}

@Entity()
export default class Profit {

    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public user_id: number;

    @Column({ type: "float" })
    public profit: number;

    @Column({ nullable: true })
    public ticket: number;

    @Column({
        type: "enum",
        enum: ProfitType,
        default: ProfitType.ORDERS
    })
    public type: ProfitType;

    @Column({ type: "float", nullable: true })
    public depositFactor: number;

    @Column({ type: "float", nullable: true })
    public workingDeposit: number;

    @Column({ nullable: true })
    public referral_id: number;

    @Column({ nullable: true })
    public referral_level: number;

    @Column({ nullable: true })
    public date: Date;
}
