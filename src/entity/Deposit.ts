import { IsNotEmpty, Min } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, AfterInsert, getRepository } from "typeorm";
import User from "./User";

export enum DepositStatus {
    PENDING,
    WORKING,
    EXPIRED
}

export enum DepositType {
    INVEST,
    REINVEST
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

    @Column({
        type: "enum",
        enum: DepositType,
        default: DepositType.INVEST
    })
    public type: DepositType;

    @Column()
    public pendingEndTime: Date;

    @CreateDateColumn({ nullable: true })
    public created: Date;

    @AfterInsert()
    public async calcucateBonus() {

        const user = await getRepository(User).findOne(this.user_id);

        if (!user) { return; }

        if (user.workingDeposit >= user.bonusLevel) {
            user.bonus += 1;
        }

        await getRepository(User).save(user);

    }

}
