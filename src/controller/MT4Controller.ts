import { Controller, Post } from "@overnightjs/core";
import { Request, Response } from "express";
import { getRepository, LessThanOrEqual } from "typeorm";
import Order from "../entity/Order";

@Controller("api/mt4")
export class MT4Controller {

    @Post("updateorders")
    private async updateOrders(req: Request, res: Response) {

        let orders: Order[];

        orders = JSON.parse(req.body) as Order[];

        for (const order of orders) {
            if ((await getRepository(Order).find({ where: { ticket: order.ticket } })).length < 1) {
                if (order.open_balance === 0 && order.close_balance === 0) {

                    const o = await getRepository(Order).find(
                        { where: { close_time: LessThanOrEqual(order.open_time) }, order: { open_time: "DESC" }
                    });

                    order.open_balance = o[o.length - 1].close_balance;
                }

                await getRepository(Order).save(order);
            } else {
                const o = await getRepository(Order).findOneOrFail({where: {ticket: order.ticket}});

                o.close_balance = order.close_balance;
                o.close_time = order.close_time;
                o.profit = order.profit;
                o.swap = order.swap;
                o.close_price = order.close_price;

                await getRepository(Order).save(o);
            }
        }

        return res.status(200).send();

    }

}
