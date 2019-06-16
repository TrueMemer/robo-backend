import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class Order {

    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ type: "float" })
    public open_price: number;

    @Column({ type: "timestamptz", nullable: true })
    public open_time: Date;

    @Column({ default: "" })
    public symbol: string;

    @Column({ type: "float" })
    public lots: number;

    @Column({ type: "float" })
    public swap: number;

    @Column({ type: "float" })
    public close_price: number;

    @Column({ type: "float" })
    public stoploss: number;

    @Column({ type: "float" })
    public takeprofit: number;

    @Column()
    public type: number;

    @Column()
    public ticket: number;

    @Column({ type: "float" })
    public profit: number;

    @Column({ type: "timestamptz", nullable: true })
    public close_time: Date;

    @Column({ type: "float" })
    public close_balance: number;

    @Column({ type: "float" })
    public open_balance: number;

    @Column({ type: "float" })
    public commission: number;

    @Column({ default: "", nullable: true })
    public comment: string;

    @Column({ default: 0 })
    public magic: number;
}
