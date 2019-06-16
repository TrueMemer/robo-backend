import { Controller, Get, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import * as moment from "moment";
import { getRepository } from "typeorm";
import * as uuid from "uuid/v4";
import Deposit, { DepositStatus } from "../entity/Deposit";

@Controller("/api/payment/payeer")
export class PayeerController {

    private static ips = [
        "185.71.65.92",
        "185.71.65.189",
        "149.202.17.210"
    ];

    @Post("status")
    private async status(req: Request, res: Response) {
        // if (!PayeerController.ips.includes(req.ip)) {
        //     return res.status(401).send();
        // }

        if (req.body.m_status === "fail") {
            return res.send(req.body.order_id + "|fail");
        }

        let deposit = new Deposit();
        deposit.user_id = parseInt(Base64.decode(req.body.m_desc), 10);
        deposit.amount = parseFloat(req.body.m_amount);
        deposit.status = DepositStatus.PENDING;
        deposit.transactionId = uuid();
        deposit.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());

        deposit = await getRepository(Deposit).save(deposit);

        return res.send(req.body.order_id + "|success");
    }

    @Get("success")
    private async success(req: Request, res: Response) {
        console.log(req.body);

        res.redirect("/addbalance");
    }

    @Get("fail")
    private async fail(req: Request, res: Response) {
        console.log(req.body);

        res.redirect("/addbalance");
    }
}
