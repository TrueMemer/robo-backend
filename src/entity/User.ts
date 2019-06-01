import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn } from "typeorm";

import { Length, IsNotEmpty, IsEmail } from "class-validator";
import * as bcrypt from 'bcryptjs';

export enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER"
}

@Entity()
@Unique(["username", "email"])
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
}
