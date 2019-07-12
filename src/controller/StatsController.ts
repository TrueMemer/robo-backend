import { Controller, Get } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { getRepository, LessThan } from "typeorm";
import Deposit from "../entity/Deposit";
import Order from "../entity/Order";
import User from "../entity/User";
import * as bestchange from "node-bestchange";
import { BestchangeIds } from "../helpers/BestchangeIds";

@Controller("api/stats")
export class StatsController {

    @Get("")
    private async getStats(req: Request, res: Response) {

        const users = await getRepository(User).count();
        const orders = await getRepository(Order).find(
            { order: { close_balance: "DESC" } });
        const balance = orders[0].close_balance;
        const { deposited } = await getRepository(Deposit)
                                .createQueryBuilder("deposit")
                                .select("sum(deposit.amount)", "deposited")
                                .getRawOne();

        const { ordersTotal } = await getRepository(Order)
                                    .createQueryBuilder("order")
                                    .select("sum(order.profit + order.swap)", "ordersTotal")
                                    .where("order.type != '6'")
                                    .getRawOne();

        const safetyDepo = ordersTotal != null ? (10 / 100) * ordersTotal : 0;

        const withdrawed = 0;

        return res.status(200).send({
            users,
            balance,
            deposited,
            safetyDepo,
            withdrawed
        });

    }

    @Get("exchanges")
    private async exchanges(req: Request, res: Response) {

        const api = await (new bestchange("./cache")).load();
        const rates = api.getRates();

        rates.data = rates.data.sort((a, b) => a.rateRecieve - b.rateRecieve);

        console.log(rates.filter(BestchangeIds.dogecoin, BestchangeIds.visa_usd)[0])
        console.log(rates.filter(BestchangeIds.visa_usd, BestchangeIds.dogecoin)[0])

        return res.status(200).send({
            bitcoin: {
                name: "BTC",
                buy: rates.filter(BestchangeIds.bitcoin, BestchangeIds.visa_usd)[0].rateReceive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.bitcoin)[0].rateGive,
            },
            ethereum: {
                name: "ETH",
                buy: rates.filter(BestchangeIds.ethereum, BestchangeIds.visa_usd)[0].rateReceive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.ethereum)[0].rateGive,
            },
            litecoin: {
                name: "LTC",
                buy: rates.filter(BestchangeIds.litecoin, BestchangeIds.visa_usd)[0].rateReceive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.litecoin)[0].rateGive,
            },
            dash: {
                name: "DASH",
                buy: rates.filter(BestchangeIds.dash, BestchangeIds.visa_usd)[0].rateReceive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.dash)[0].rateGive,
            },
            dogecoin: {
                name: "DOGE",
                buy: rates.filter(BestchangeIds.dogecoin, BestchangeIds.visa_usd)[0].rateReceive
                    / rates.filter(BestchangeIds.dogecoin, BestchangeIds.visa_usd)[0].rateGive,
                sell: rates.filter(BestchangeIds.visa_usd, BestchangeIds.dogecoin)[0].rateGive 
                    / rates.filter(BestchangeIds.visa_usd, BestchangeIds.dogecoin)[0].rateReceive
            }
        });

    }

}
