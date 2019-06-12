import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, Double, getRepository } from "typeorm";

import { Length, IsNotEmpty, IsEmail } from "class-validator";
import * as bcrypt from 'bcryptjs';
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
    id: number;

    @Column()
    @Length(4, 20)
    username: string;

    @Column({ select: false })
    @Length(4, 128)
    password: string;

    @Column()
    @IsEmail()
    email: string;

    @Column({ default: false })
    isVerified: boolean;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.USER
    })
    @IsNotEmpty()
    role: UserRole;

    @Column({ type: "float", default: 0.0 })
    balance: number;

    @Column({ type: "float", default: 0.0 })
    payedAllTime: number;

    @Column({ type: "float", default: 0.0 })
    workingDeposit: number;

    @Column({ type: "float", default: 0.0 })
    freeDeposit: number;

    @Column({ type: "float", default: 0.0 })
    pendingDeposit: number;

    @Column({ default: new Date(0), type: "timestamptz" })
    pendingEndTime: Date;

    @Column({ default: "" })
    bitcoinWallet: string;

    @Column({ default: "" })
    advcashWallet: string;

    @Column({ default: "" })
    payeerWallet: string;

    @Column({ default: "" })
    payPin: string;

    @Column()
    @CreateDateColumn()
    createdAt: Date;
  
    @Column()
    @UpdateDateColumn()
    updatedAt: Date;

    profitTotal: number;

    withdrawedTotal: number;

    hashPassword() {
        this.password = bcrypt.hashSync(this.password, 8);
    }

    checkIfUnencryptedPasswordIsValid(unencryptedPassword: string) {
        return bcrypt.compareSync(unencryptedPassword, this.password);
    }

    updateBalance() {
        this.balance = this.freeDeposit + this.workingDeposit + this.pendingDeposit;
    }

    async updateDeposits() {
        const deposits = await getRepository(Deposit).find({ where: { user_id: this.id }, select: ["amount", "status"] });

        let amount_pending = 0;
        let amount_working = 0;

        for (let d of deposits) {
            if (d.status == DepositStatus.PENDING)
                amount_pending += d.amount;
            else if (d.status == DepositStatus.WORKING) 
                amount_working += d.amount;
        }

        this.pendingDeposit = amount_pending;
        this.workingDeposit = amount_working;
    }
}
