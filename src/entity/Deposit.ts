import { IsNotEmpty, Min, IsNumber } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, AfterInsert, getRepository, AfterUpdate } from "typeorm";
import User from "./User";
import Profit, { ProfitType } from "./Profit";
import moment = require("moment");


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
    @IsNumber()
    public user_id: number;

    @Column({ default: "" })
    public transactionId: string;

    @Column({ type: "float" })
    @IsNotEmpty()
    @Min(1)
    public amount: number;

    @Column({
        type: "enum",
        enum: DepositStatus,
        default: DepositStatus.PENDING
    })
    public status: DepositStatus;

    @Column({
        type: "enum",
        enum: DepositType,
        default: DepositType.INVEST
    })
    public type: DepositType;

    @Column({
        default: new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format())
    })
    public pendingEndTime: Date;

    @CreateDateColumn({ nullable: true, default: new Date(Date.now()) })
    public created: Date;

    @AfterInsert()
    public async calcucateBonus() {
        /*
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
        */

    }

    @AfterInsert()
    @AfterUpdate()
    public async updateTimer() {

        const user = await getRepository(User).findOne(this.user_id);

        const workingDepo = await user.getWorkingDepo();

        if (workingDepo === 0) {
            user.workingDepositTimeEnd = new Date(0);

            if (workingDepo <= 1000) {
                user.workingDepositTimeEnd = new Date(moment().utc().add(12, "months").format());
            } else if (workingDepo <= 2500) {
                user.workingDepositTimeEnd = new Date(moment().utc().add(9, "months").format());
            } else {
                user.workingDepositTimeEnd = new Date(moment().utc().add(7, "months").format());
            }
        }

        await getRepository(User).save(user);

    }

}
