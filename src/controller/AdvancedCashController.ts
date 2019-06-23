import { Controller, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import moment = require("moment");
import { getRepository } from "typeorm";
import Deposit, { DepositStatus } from "../entity/Deposit";
import Transaction, { TransactionStatus, TransactionType } from "../entity/Transaction";

@Controller("api/payment")
export class AdvancedCashController {

    private ips = [
        "50.7.115.5",
        "51.255.40.139"
    ];

    @Post("status")
    private async status(req: Request, res: Response) {

        if (!this.ips.includes(req.ip)) {
            return res.status(401).send();
        }

        if (req.body.ac_transaction_status === "COMPLETED") {
            let transaction = new Transaction();

            transaction.amount_usd = req.body.ac_buyer_amount_without_commission;
            transaction.currency = "Advanced Cash";
            transaction.id = req.body.ac_order_id;
            transaction.dateDone = req.body.ac_start_date;
            transaction.user_id = req.body.user_id;
            transaction.type = TransactionType.PAYIN;
            transaction.status = TransactionStatus.DONE;

            transaction = await getRepository(Transaction).save(transaction);

            const deposit = new Deposit();

            deposit.user_id = transaction.user_id;
            deposit.amount = transaction.amount_usd;
            deposit.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());
            deposit.status = DepositStatus.PENDING;
            deposit.transactionId = transaction.id;

            await getRepository(Deposit).save(deposit);
        }

    }

}
