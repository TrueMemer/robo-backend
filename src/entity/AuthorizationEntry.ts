import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class AuthorizationEntry {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public user_id: number;

    @CreateDateColumn()
    public date: Date;

    @Column()
    public ip: string;

    @Column({ default: "" })
    public country: string;
}