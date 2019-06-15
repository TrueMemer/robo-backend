import { Request, Response } from "express-serve-static-core";
import Deposit, { DepositStatus } from "../entity/Deposit";
import { getRepository } from "typeorm";
import moment = require("moment");
import uuid = require("uuid/v4");

export default class PerfectMoneyController {

    static status = async (req: Request, res: Response) => {
        
        let deposit = new Deposit();
        deposit.user_id = parseInt(req.body["USER_ID"]);
        deposit.amount = parseFloat(req.body["PAYMENT_AMOUNT"]);
        deposit.status = DepositStatus.PENDING;
        deposit.transactionId = uuid();
        deposit.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());

        deposit = await getRepository(Deposit).save(deposit);

        res.send(200);
    }

    static fail = (req: Request, res: Response) => {

        res.send(200);

    }

}