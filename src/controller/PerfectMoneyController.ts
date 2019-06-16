import { Controller, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import moment = require("moment");
import { getRepository } from "typeorm";
import uuid = require("uuid/v4");

import Deposit, { DepositStatus } from "../entity/Deposit";

@Controller("api/payment/pm")
export class PerfectMoneyController {

    @Post()
    private async status(req: Request, res: Response) {
        let deposit = new Deposit();
        deposit.user_id = parseInt(req.body.USER_ID, 10);
        deposit.amount = parseFloat(req.body.PAYMENT_AMOUNT);
        deposit.status = DepositStatus.PENDING;
        deposit.transactionId = uuid();
        deposit.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());

        deposit = await getRepository(Deposit).save(deposit);

        res.send(200);
    }

    @Post()
    private async fail(req: Request, res: Response) {
        res.send(200);
    }

}
