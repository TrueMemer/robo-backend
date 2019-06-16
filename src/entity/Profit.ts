import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class Profit {

    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public user_id: number;

    @Column({ type: "float" })
    public profit: number;

    @Column()
    public ticket: number;

    @Column({ type: "float" })
    public depositFactor: number;

    @Column({ type: "float" })
    public workingDeposit: number;
}
