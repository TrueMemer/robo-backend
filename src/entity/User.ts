import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, Double } from "typeorm";

import { Length, IsNotEmpty, IsEmail } from "class-validator";
import * as bcrypt from 'bcryptjs';

export enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER"
}

@Entity()
@Unique(["username"])
@Unique(["email"])
export class User {

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

    hashPassword() {
        this.password = bcrypt.hashSync(this.password, 8);
    }

    checkIfUnencryptedPasswordIsValid(unencryptedPassword: string) {
        return bcrypt.compareSync(unencryptedPassword, this.password);
    }

    updateBalance() {
        this.balance = this.freeDeposit + this.workingDeposit + this.pendingDeposit;
    }
}
