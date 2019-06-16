import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Referral {

    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public referrer: number;

    @Column()
    public referral: number;
}
