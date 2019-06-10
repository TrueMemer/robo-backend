import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export default class Order {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "float" })
    open_price: number;

    @Column({ type: "timestamptz", nullable: true })
    open_time: Date;

    @Column({ default: "" })
    symbol: string;

    @Column({ type: "float" })
    lots: number;

    @Column({ type: "float" })
    swap: number;

    @Column({ type: "float" })
    close_price: number;

    @Column({ type: "float" })
    stoploss: number;

    @Column({ type: "float" })
    takeprofit: number;

    @Column()
    type: number;

    @Column()
    ticket: number;

    @Column({ type: "float" })
    profit: number;

    @Column({ type: "timestamptz", nullable: true })
    close_time: Date;

    @Column({ type: "float" })
    close_balance: number;

    @Column({ type: "float" })
    open_balance: number;

    @Column({ type: "float" })
    commission: number;

    @Column({ default: "", nullable: true })
    comment: string;

    @Column({ default: 0 })
    magic: number;
}