import { Controller, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import moment = require("moment");
import { getRepository } from "typeorm";
import uuid = require("uuid/v4");

import Deposit, { DepositStatus } from "../entity/Deposit";
import Transaction, { TransactionStatus, TransactionType } from "../entity/Transaction";

@Controller("api/payment/pm")
export class PerfectMoneyController {

    @Post("status")
    private async status(req: Request, res: Response) {

        let ips = [
            "77.109.141.170",
            "91.205.41.208",
            "94.242.216.60",
            "78.41.203.75"
        ];

        if (!ips.includes(req.ip)) {
             return res.status(401).send();
        }

        let transaction = new Transaction();
        transaction.amount_usd = parseFloat(req.body.PAYMENT_AMOUNT);
        transaction.user_id = parseInt(req.body.USER_ID, 10);
        transaction.status = TransactionStatus.DONE;
        transaction.currency = "Perfect Money USD";
        transaction.type = TransactionType.PAYIN;
        transaction.dateCreated = new Date(moment().utc().format());
        transaction.dateDone = new Date(moment().utc().format());

        transaction = await getRepository(Transaction).save(transaction);

        let deposit = new Deposit();
        deposit.user_id = transaction.user_id;
        deposit.amount = transaction.amount_usd;
        deposit.status = DepositStatus.PENDING;
        deposit.transactionId = transaction.id;
        deposit.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());

        deposit = await getRepository(Deposit).save(deposit);

        Deposit.sendToTelegram(deposit);

        res.send(200);
    }

    @Post("fail")
    private async fail(req: Request, res: Response) {
        res.redirect("/profile/addbalance");
    }

}
