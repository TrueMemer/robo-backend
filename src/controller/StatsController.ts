import { Controller, Get } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { getRepository, LessThan } from "typeorm";
import Deposit from "../entity/Deposit";
import Order from "../entity/Order";
import User from "../entity/User";

@Controller("api/stats")
export class StatsController {

    @Get("")
    private async getStats(req: Request, res: Response) {

        const users = await getRepository(User).count();
        const orders = await getRepository(Order).find(
            { order: { ticket: "DESC", close_time: "DESC" } });
        const balance = orders[0].close_balance;
        const { deposited } = await getRepository(Deposit)
                                .createQueryBuilder("deposit")
                                .select("sum(deposit.amount)", "deposited")
                                .getRawOne();

        let safetyDepo = 0;

        for (const o of orders) {
            if (o.type === 6) {
                continue;
            }

            const profit = o.profit + o.swap;
            if (profit > 0) {
                safetyDepo += (10 / 100) * profit;
            } else {
                safetyDepo += profit;
            }
        }

        const withdrawed = 0;

        return res.status(200).send({
            users,
            balance,
            deposited,
            safetyDepo,
            withdrawed
        });

    }

}
