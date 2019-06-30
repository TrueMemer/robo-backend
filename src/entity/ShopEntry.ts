import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum ShopEntryType {
    MONEY,
    REFERRAL,
    OTHER
}

@Entity()
export class ShopEntry {

    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public type: ShopEntryType;

    @Column()
    public price: number;

    @Column({ nullable: true })
    public award: number;

}