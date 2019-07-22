import * as bcrypt from "bcryptjs";
import { IsEmail, IsNotEmpty, Length, IsNumber, IsBoolean } from "class-validator";
import * as typeorm from "typeorm";
import { Column, CreateDateColumn, Entity,
    getRepository, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import Deposit, { DepositStatus } from "./Deposit";
import Profit from "./Profit";
import Withdrawal from "./Withdrawal";

export enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER"
}

@Entity()
@Unique(["username"])
@Unique(["email"])
export default class User {

    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    @IsNotEmpty()
    @Length(4, 20)
    public username: string;

    @Column({ select: false })
    @IsNotEmpty()
    @Length(4, 128)
    public password: string;

    @Column()
    @IsEmail()
    public email: string;

    @Column({ default: false })
    @IsBoolean()
    public isVerified: boolean;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.USER
    })
    @IsNotEmpty()
    public role: UserRole;

    @Column({ type: "float", default: 0.0 })
    public balance: number;

    @Column({ type: "float", default: 0.0 })
    public payedAllTime: number;

    @Column({ type: "float", default: 0.0 })
    public workingDeposit: number;

    @Column({ default: new Date(0) })
    public workingDepositTimeEnd: Date;

    @Column({ nullable: true })
    public firstDepositTime: Date;

    @Column({ type: "float", default: 0.0 })
    public pendingDeposit: number;

    @Column({ default: new Date(0), type: "timestamptz" })
    public pendingEndTime: Date;

    @Column({ default: "" })
    public bitcoinWallet: string;

    @Column({ default: "" })
    public litecoinWallet: string;

    @Column({ default: "" })
    public dogecoinWallet: string;

    @Column({ default: "" })
    public pwWallet: string;

    @Column({ default: "" })
    public advcashWallet: string;

    @Column({ default: "" })
    public payeerWallet: string;

    @Column({ default: "" })
    public ethereumWallet: string;

    @Column({ default: "" })
    public cardNumber: string;

    @Column({ default: "" })
    public payPin: string;

    @Column({ default: false })
    public twofa: boolean;

    @Column({ nullable: true })
    public twofaSecret: string;

    @Column({ default: 0 })
    public bonus: number;

    @Column({ default: 0 })
    public bonusLevel: number;

    @Column({ nullable: true })
    public telegram_id: string;

    @Column({ nullable: true })
    public telegram_language: string;

    @Column()
    @CreateDateColumn()
    public createdAt: Date;

    @Column()
    @UpdateDateColumn()
    public updatedAt: Date;

    public profitTotal: number;

    public withdrawedTotal: number;

    public freeDeposit: number;

    public referralTotalIncome: number;

    @Column({nullable: true})
    public referral: string;

    @Column({default: 0})
    public referral_level: number;

    public hashPassword() {
        this.password = bcrypt.hashSync(this.password, 8);
    }

    public checkIfUnencryptedPasswordIsValid(unencryptedPassword: string) {
        return bcrypt.compareSync(unencryptedPassword, this.password);
    }

    public async getFreeDeposit() {
        const { ordersTotalIncome } = await getRepository(Profit)
                .createQueryBuilder("profit")
                .where("profit.type = '0'")
                .andWhere("profit.user_id = :id", { id: this.id })
                .select("sum(profit.profit)", "ordersTotalIncome")
                .getRawOne();

        const { returnTotalIncome } = await getRepository(Profit)
                .createQueryBuilder("profit")
                .where("profit.type = '4'")
                .andWhere("profit.user_id = :id", { id: this.id })
                .select("sum(profit.profit)", "returnTotalIncome")
                .getRawOne();

        const { otherTotalIncome } = await getRepository(Profit)
                .createQueryBuilder("profit")
                .where("profit.type = '3'")
                .andWhere("profit.user_id = :id", { id: this.id })
                .select("sum(profit.profit)", "otherTotalIncome")
                .getRawOne();

        const { referralTotalIncome } = await getRepository(Profit)
                .createQueryBuilder("profit")
                .where("profit.type = '1'")
                .andWhere("profit.user_id = :id", { id: this.id })
                .select("sum(profit.profit)", "referralTotalIncome")
                .getRawOne();

        this.referralTotalIncome = referralTotalIncome != null ? referralTotalIncome : 0;
        this.profitTotal = (ordersTotalIncome != null ? ordersTotalIncome : 0) +
            (otherTotalIncome != null ? otherTotalIncome : 0);

        const { withdrawedTotal } = await getRepository(Withdrawal)
            .createQueryBuilder("withdrawal")
            .where("withdrawal.user_id = :id", { id: this.id })
            .andWhere("withdrawal.type = '0'")
            .andWhere("withdrawal.status = '1'")
            .select("sum(withdrawal.amount)", "withdrawedTotal")
            .getRawOne();

        const { reinvestedTotal } = await getRepository(Withdrawal)
                                        .createQueryBuilder("withdrawal")
                                        .where("withdrawal.user_id = :id", { id: this.id })
                                        .andWhere("withdrawal.type = '1'")
                                        .select("sum(withdrawal.amount)", "reinvestedTotal")
                                        .getRawOne();

        this.freeDeposit = (this.referralTotalIncome + this.profitTotal) -
            ((withdrawedTotal != null ? withdrawedTotal : 0) + (reinvestedTotal != null ? reinvestedTotal : 0))
            + (returnTotalIncome != null ? returnTotalIncome : 0);

        return this.freeDeposit;
    }

    public updateBalance() {
        this.balance = this.freeDeposit + this.workingDeposit + this.pendingDeposit;
    }

    public async getWorkingDepo() {

        const { depo } = await getRepository(Deposit)
                                .createQueryBuilder("deposit")
                                .select("sum(amount)", "depo")
                                .where("user_id = :id", { id: this.id })
                                .andWhere("status = :status", { status: DepositStatus.WORKING })
                                .getRawOne();

        return depo != null ? depo : 0;

    }

    public async updateDeposits() {
        const deposits = await typeorm.getRepository(Deposit).find(
            { where: { user_id: this.id }, select: ["amount", "status"]
        });

        let amount_pending = 0;
        let amount_working = 0;

        for (const d of deposits) {
            if (d.status === DepositStatus.PENDING) {
                amount_pending += d.amount;
            } else if (d.status === DepositStatus.WORKING) {
                amount_working += d.amount;
            }
        }

        this.pendingDeposit = amount_pending;
        this.workingDeposit = amount_working;
    }
}
