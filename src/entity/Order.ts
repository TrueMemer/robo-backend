import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("Orders")
export default class Order {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "float" })
    open_price: number;

    @Column({ type: "timestamptz" })
    open_time: Date;

    @Column()
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

    @Column({ type: "timestamptz" })
    close_time: Date;

    @Column({ type: "float" })
    close_balance: number;

    @Column({ type: "float" })
    open_balance: number;

    @Column({ type: "timestamptz" })
    expiration: Date;

    @Column({ type: "float" })
    commission: number;

    @Column({ default: "" })
    comment: string;

    @Column({ default: 0 })
    magic: number;
}