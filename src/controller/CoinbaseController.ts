import { Controller, Post, ClassMiddleware, Checkout, Middleware } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { JWTChecker } from "../middlewares/JWTChecker";
import { Client, resources, CreateCharge, ChargeResource, EventResource } from "coinbase-commerce-node";
import config from "../config/config";
import axios from "axios";
import { getRepository } from "typeorm";
import User from "../entity/User";
import CryptoTransaction from "../entity/CryptoTransaction";
import { TransactionStatus, TransactionType } from "../entity/Transaction";
import Deposit, { DepositStatus, DepositType } from "../entity/Deposit";
import moment = require("moment");
import { BestchangeIds } from "../helpers/BestchangeIds";
import * as bestchange from "node-bestchange";

@Controller("api/payment/coinbase")
export class CoinbaseController {

    @Post("create")
    @Middleware([JWTChecker])
    private async create(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        const { amount } = req.body;

        if (!amount) {
            return res.status(400).send({
                msg: "No amount provided",
                code: 400
            });
        }

        const api = await (new bestchange("./cache")).load();
        let rates;

        try {
            rates = await api.getRates().filter(BestchangeIds.ethereum, BestchangeIds.visa_usd);
        } catch (e) {
            console.log(e);
            return res.status(400).send({
                msg: "Currency is not supported",
                code: 400
            });
        }

        rates = rates.sort((a, b) => a.rateRecieve - b.rateRecieve);

        const eth_amount = (1 / rates[0].rateReceive * amount);

        let t = new CryptoTransaction();
        t.amount_usd = amount;
        t.amount_currency = eth_amount;
        t.dateCreated = new Date(Date.now());
        t.receive_address = "";
        t.status = TransactionStatus.PENDING;
        t.type = TransactionType.PAYIN;
        t.user_id = user.id;
        t.currency = "ethereum";

        t = await getRepository(CryptoTransaction).save(t);

        const cb = Client.init(config.coinbase.api_key);

        const chargeData: CreateCharge = {
            name: "ROBO FX TRADING",
            description: "ROBO FX TRADING INVESTMENT",
            pricing_type: "fixed_price",
            local_price: {
                amount: eth_amount.toString(),
                currency: "ETH"
            },
            metadata: {
                user_id: user.id,
                transaction_id: t.id
            },
            redirect_url: "https://robofxtrading.net/profile/addbalance",
            cancel_url: "https://robofxtrading.net/profile/addbalance",
        };


        const resp: ChargeResource = await new Promise((resolve, reject) => {
            resources.Charge.create(chargeData, (error, response) => {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });

        return res.status(200).send({url: resp.hosted_url});
    }

    @Post("status")
    private async status(req: Request, res: Response) {

        const event = req.body.event;

        switch (event.type) {
            case "charge:created": {
                console.log("created");
            } break;
            case "charge:confirmed": {

                const t = await getRepository(CryptoTransaction).findOne(event.data.metadata.transaction_id);

                t.dateDone = new Date(Date.now());
                t.status = TransactionStatus.DONE;

                await getRepository(CryptoTransaction).save(t);

                let d = new Deposit();

                d.amount = t.amount_usd;
                d.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());
                d.status = DepositStatus.PENDING;
                d.transactionId = t.id;
                d.type = DepositType.INVEST;
                d.user_id = t.user_id;

                await getRepository(Deposit).save(d);
 
            } break;
            case "charge:failed": {

                const t = await getRepository(CryptoTransaction).findOne(event.data.metadata.transaction_id);

                t.dateDone = new Date(Date.now());
                t.status = TransactionStatus.FAILED;

                await getRepository(CryptoTransaction).save(t);

            } break;
        }

        res.status(200).send();

    }

}