import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export default class Profit {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    user_id: number;

    @Column({ type: "float" })
    profit: number;

    @Column()
    ticket: number;

    @Column({ type: "float" })
    depositFactor: number;

}