import { Controller, Get } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import * as bestchange from "node-bestchange";
import { getRepository, LessThan, MoreThan } from "typeorm";
import CryptoTransaction from "../entity/CryptoTransaction";
import Deposit, { DepositType } from "../entity/Deposit";
import Order from "../entity/Order";
import User from "../entity/User";
import { BestchangeIds } from "../helpers/BestchangeIds";

import Transaction from "../entity/Transaction";
import Withdrawal from "../entity/Withdrawal";

@Controller("api/stats")
export class StatsController {

    @Get("")
    private async getStats(req: Request, res: Response) {

        const users = await getRepository(User).count();
        const orders = await getRepository(Order).find(
            { order: { close_time: "DESC" }, take: 1 });
        let balance = 0;
        if (orders != null && orders.length !== 0) {
            balance = orders[0].close_balance;
        }
        const deposited = (await getRepository(Deposit)
                                .createQueryBuilder("deposit")
                                .select("sum(deposit.amount)", "deposited")
                                .getRawOne() || {}).deposited || 0;

        const ordersTotal = (await getRepository(Order)
                                    .createQueryBuilder("order")
                                    .select("sum(order.profit + order.swap)", "ordersTotal")
                                    .where("order.type != '6'")
                                    .getRawOne() || {}).ordersTotal || 0;

        const safetyDepo = (10 / 100) * ordersTotal;

        const withdrawed = (await getRepository(Withdrawal)
                       .createQueryBuilder("withdrawal")
                       .select("sum(amount)", "withdrawed")
                       .where("status = '1'")
                       .andWhere("type = '0'")
                       .getRawOne() || {}).withdrawed || 0;

        return res.status(200).send({
            users,
            balance,
            deposited,
            safetyDepo,
            withdrawed
        });

    }

    @Get("getLastDeposits")
    private async getLastDeposits(req: Request, res: Response) {

        const deposits = await getRepository(Deposit).find({
            where: { type: DepositType.INVEST, amount: MoreThan(99) },
            order: { created: "DESC" },
            take: 5,
            select: ["created", "amount", "transactionId", "user_id"]
        });

        const result = [];

        for (const d of deposits) {

            const entry = d as any;

            if (d.transactionId && d.transactionId != "" && d.transactionId != " ") {
                let t = await getRepository(Transaction).findOne({ id: d.transactionId });
                if (!t) {
                    t = await getRepository(CryptoTransaction).findOne({ id: d.transactionId });
                }

                entry.currency = t != null ? t.currency : "bitcoin";
            } else {
                entry.currency = "bitcoin";
            }

            const user = await getRepository(User).findOne(d.user_id);
            if (user) {
                const username = user.username;
                entry.username = username.slice(0, 2) + "******" + username.slice(-2);
            }

            delete entry.transactionId;

            result.push(entry);
        }

        return res.send({ result });

    }

    @Get("exchanges")
    private async exchanges(req: Request, res: Response) {

        const api = await (new bestchange("./cache")).load();
        const rates = api.getRates();

        const sortRecieve = (a, b) => b.rateReceive - a.rateReceive;
        const sortGive = (a, b) => a.rateGive - b.rateGive;

        const result = {
            bitcoin: {
                name: "BTC",
                buy: rates.filter(BestchangeIds.bitcoin, BestchangeIds.visa_usd).sort(sortRecieve)[0].rateReceive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.bitcoin).sort(sortGive)[0].rateGive,
            },
            ethereum: {
                name: "ETH",
                buy: rates.filter(BestchangeIds.ethereum, BestchangeIds.visa_usd).sort(sortRecieve)[0].rateReceive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.ethereum).sort(sortGive)[0].rateGive,
            },
            litecoin: {
                name: "LTC",
                buy: rates.filter(BestchangeIds.litecoin, BestchangeIds.visa_usd).sort(sortRecieve)[0].rateReceive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.litecoin).sort(sortGive)[0].rateGive,
            },
            dash: {
                name: "DASH",
                buy: rates.filter(BestchangeIds.dash, BestchangeIds.visa_usd).sort(sortRecieve)[0].rateReceive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.dash).sort(sortGive)[0].rateGive,
            },
            dogecoin: {
                name: "DOGE",
                buy: rates.filter(BestchangeIds.dogecoin, BestchangeIds.visa_usd).sort(sortRecieve)[0].rateReceive
                    / rates.filter(BestchangeIds.dogecoin, BestchangeIds.visa_usd).sort(sortRecieve)[0].rateGive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.dogecoin).sort(sortGive)[0].rateGive
                    / rates.filter(BestchangeIds.visa_usd, BestchangeIds.dogecoin).sort(sortGive)[0].rateReceive
            }
        };

        return res.status(200).send(result);

    }

}
