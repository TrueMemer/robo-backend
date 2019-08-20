import { Controller, Middleware, Post, Get } from "@overnightjs/core";
import axios from "axios";
import { Request, Response } from "express-serve-static-core";
import { getRepository } from "typeorm";
import * as uuid from "uuid/v4";
import User from "../entity/User";
import { JWTChecker } from "../middlewares/JWTChecker";
import moment = require("moment");
import md5 = require("md5");
import Transaction, { TransactionStatus, TransactionType } from "../entity/Transaction";
import Deposit, { DepositStatus, DepositType } from "../entity/Deposit";

@Controller("api/payment/pipo")
export class PayinPayout {

    @Post("create")
    @Middleware([JWTChecker])
    private async create(req: Request, res: Response) {

        const { amount } = req.body;

        if (amount < 100) {
            return res.status(400).send({
                msg: "Minimum deposit is 100$",
                code: 400
            });
        }

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        const uid = uuid();
        const agentTime = moment().utc().format("HH:mm:SS DD.MM.YYYY");

        let r;
        try {
            r = await axios.get(`https://api.cryptonator.com/api/ticker/usd-rur`);
        } catch (error) {
            return res.status(400).send({
                msg: "Can't convert currency (cryptonator is down?)",
                code: 400,
            });
        }

        const formAmount = ((amount * await r.data.ticker.price) * 1.055).toFixed(2);

        let sign_raw = `4283#${uid}#${agentTime}#${formAmount}#79090000001#${md5("W53prbl4uC")}`;

        let address = "https://lk.payin-payout.net/api/shop" +
            "?agentId=" + "4283" +
            "&orderId=" + uid +
            "&agentName=ROBO FX TRADING" +
            "&amount=" + formAmount +
            "&goods=ROBO FX TRADING INVEST" +
            "&currency=RUR" +
            "&addInfo_userid=" + user.id +
            "&email=" + user.email +
            "&phone=79090000001" +
            "&agentTime=" + agentTime +
            "&sign=" + md5(sign_raw);


	    const t = new Transaction();
        t.amount_usd = parseFloat(formAmount);
        t.currency = "Card USD";
        t.dateCreated = new Date(Date.now());
        t.status = TransactionStatus.PENDING;
        t.user_id = user.id;
        t.type = TransactionType.PAYIN;

        await getRepository(Transaction).save(t);

        return res.status(200).send({
            url: address
        });
    }

    @Post("status")
    private async status(req: any, res: Response) {

        let hash = md5(`4283#${req.body.orderId}#${req.body.paymentId}#${req.body.amount}#${req.body.phone}#${req.body.paymentStatus}#${req.bodypaymentDate}#md5("W53prbl4uC")`);

        if (req.body.sign !== hash) {
            return res.status(401).send();
        }

        let t = await getRepository(Transaction).findOne(req.body.orderId);

        if (!t) {
            return res.status(200).send();
        }

        if (req.body.paymentStatus == 1) {
            t.dateDone = new Date(Date.now());
            t.status = TransactionStatus.DONE;

            t = await getRepository(Transaction).save(t);

            let d = new Deposit();

            d.amount = t.amount_usd;
            d.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());
            d.status = DepositStatus.PENDING;
            d.transactionId = t.id;
            d.type = DepositType.INVEST;
            d.user_id = req.body.addInfo_userid;

            d = await getRepository(Deposit).save(d);

            Deposit.sendToTelegram(d);

            return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><response><result>0</result></response>`);
        } else if(req.body.paymentStatus == 2) {
            t.dateDone = new Date(Date.now());
            t.status = TransactionStatus.FAILED;

            t = await getRepository(Transaction).save(t);

            return res.send(`<?xml version="1.0" encoding="UTF-8"?><response><result>1</result></response>`);
        }

	    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><response><result>0</result></response>`);

    }



}
