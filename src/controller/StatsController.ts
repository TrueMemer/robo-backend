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

        const { ordersTotal } = await getRepository(Order)
                                    .createQueryBuilder("order")
                                    .select("sum(order.profit)", "ordersTotal")
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

}
