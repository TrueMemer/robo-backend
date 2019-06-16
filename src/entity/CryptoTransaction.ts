import { IsNotEmpty, Min, NotEquals } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import Transaction from "./Transaction";

@Entity()
export default class CryptoTransaction extends Transaction {

    @Column({ type: "float" })
    public amount_currency: number;

    @Column()
    public receive_address: string;

}
