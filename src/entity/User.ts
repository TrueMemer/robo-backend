import * as bcrypt from "bcryptjs";
import { IsEmail, IsNotEmpty, Length } from "class-validator";
import * as typeorm from "typeorm";
import { Column, CreateDateColumn, Entity,
    PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent, Unique, UpdateDateColumn } from "typeorm";
import Deposit, { DepositStatus } from "./Deposit";

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
    @Length(4, 20)
    public username: string;

    @Column({ select: false })
    @Length(4, 128)
    public password: string;

    @Column()
    @IsEmail()
    public email: string;

    @Column({ default: false })
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

    @Column({ type: "float", default: 0.0 })
    public pendingDeposit: number;

    @Column({ default: new Date(0), type: "timestamptz" })
    public pendingEndTime: Date;

    @Column({ default: "" })
    public bitcoinWallet: string;

    @Column({ default: "" })
    public advcashWallet: string;

    @Column({ default: "" })
    public payeerWallet: string;

    @Column({ default: "" })
    public payPin: string;

    @Column()
    @CreateDateColumn()
    public createdAt: Date;

    @Column()
    @UpdateDateColumn()
    public updatedAt: Date;

    public profitTotal: number;

    public withdrawedTotal: number;

    public freeDeposit: number;

    public referral: string;

    @Column({default: 0})
    public referral_level: number;

    public hashPassword() {
        this.password = bcrypt.hashSync(this.password, 8);
    }

    public checkIfUnencryptedPasswordIsValid(unencryptedPassword: string) {
        return bcrypt.compareSync(unencryptedPassword, this.password);
    }

    public updateBalance() {
        this.balance = this.freeDeposit + this.workingDeposit + this.pendingDeposit;
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
