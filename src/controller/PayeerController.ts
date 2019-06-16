import { Controller, Get, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import * as moment from "moment";
import { getRepository } from "typeorm";
import * as uuid from "uuid/v4";
import Deposit, { DepositStatus } from "../entity/Deposit";
import Transaction, { TransactionStatus, TransactionType } from "../entity/Transaction";

@Controller("api/payment/payeer")
export class PayeerController {

    private static ips = [
        "185.71.65.92",
        "185.71.65.189",
        "149.202.17.210"
    ];

    @Post("status")
    private async status(req: Request, res: Response) {
        const ip = req.ip;
        console.log(req.ip);

        if (!PayeerController.ips.includes(ip)) {
             return res.status(401).send();
        }

        if (req.body.m_status === "fail") {
            return res.send(req.body.order_id + "|fail");
        }

        let transaction = new Transaction();
        transaction.amount_usd = parseFloat(req.body.m_amount);
        transaction.user_id = parseInt(Buffer.from(req.body.m_desc, "base64").toString(), 10);
        transaction.status = TransactionStatus.DONE;
        transaction.currency = "USD";
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
