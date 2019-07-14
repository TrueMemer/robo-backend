import { IsNotEmpty, Min } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, AfterInsert, getRepository } from "typeorm";
import User from "./User";
import Profit, { ProfitType } from "./Profit";

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
            const profit = new Profit();

            profit.user_id = this.user_id;
            // profit.type = ProfitType.REFERRAL_BONUS;
            profit.profit = 1;

            await getRepository(Profit).save(profit);

            user.bonusLevel += 1000;

            const referral = await getRepository(User).findOne({
                where: { username: user.referral }
            });

            if (referral) {
                const p = new Profit();

                p.profit = 1;
                p.user_id = referral.id;
                // p.type = ProfitType.REFERRAL_BONUS;
                p.referral_id = user.id;

                await getRepository(Profit).save(p);
            }
        }

        await getRepository(User).save(user);

    }

}
