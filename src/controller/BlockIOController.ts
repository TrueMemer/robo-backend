import { ClassMiddleware, Controller, Post } from "@overnightjs/core";
import axios from "axios";
import { validate } from "class-validator";
import { Request, Response } from "express-serve-static-core";
import * as moment from "moment";
import { getRepository } from "typeorm";
import config from "../config/config";
import CryptoTransaction from "../entity/CryptoTransaction";
import Deposit, { DepositStatus } from "../entity/Deposit";
import { TransactionStatus, TransactionType } from "../entity/Transaction";
import User from "../entity/User";
import CryptoNames from "../helpers/CryptoNames";
import { JWTChecker } from "../middlewares/JWTChecker";
import { BestchangeIds } from "../helpers/BestchangeIds";
const bestchange = require("node-bestchange");

@Controller("api/payment/crypto")
@ClassMiddleware([JWTChecker])
export class BlockIOController {

    @Post("createPayment")
    private async createPayment(req: Request, res: Response) {

        const user_id = res.locals.jwtPayload.userId;

        let p: CryptoTransaction = new CryptoTransaction();

        const { currency, amount_usd } = req.body;

        if (amount_usd < 100) {
            return res.status(400).send({
                msg: "Minimal is 100$",
                code: 400
            });
        }

        p.user_id = user_id;
        p.currency = currency;
        p.amount_usd = amount_usd;

        const errors = await validate(p);
        if (errors.length > 0) {
            return res.status(400).send({
                msg: "Validation error",
                code: 400,
                errors
            });
        }

        const api = await (new bestchange("./cache")).load();
        let rates;

        try {
            rates = await api.getRates().filter(BestchangeIds[currency], BestchangeIds.visa_usd);
        } catch (e) {
            console.log(e);
            return res.status(400).send({
                msg: "Currency is not supported",
                code: 400,
                currency
            });
        }

        rates = rates.sort((a, b) => a.rateRecieve - b.rateRecieve);

        console.log(rates);

        if (rates[0].rateReceive === 1) {
            p.amount_currency = rates[0].rateGive * p.amount_usd;
        } else {
            p.amount_currency = (1 / rates[0].rateReceive * p.amount_usd);
        }

        p.dateCreated = new Date(Date.now());

        let r;

        try {
            /* tslint:disable max-line-length */
            r = await axios.get(`https://block.io/api/v2/get_new_address/?api_key=${config.blockio.api_keys[p.currency]}`);
            /* tslint:enable max-line-length */
        } catch (error) {
            console.log(error);
            return res.status(400).send({
                msg: "This currency is not supported",
                code: 400,
                currency: p.currency
            });
        }

        const { status, data } = await r.data;
        if (status !== "success") {
            console.log(data);
            return res.status(400).send({
                msg: "This currency is not supported",
                code: 400,
                currency: p.currency
            });
        }

        p.receive_address = data.address;
        p.type = TransactionType.PAYIN;

        // try to save pending transaction
        try {
            p = await getRepository(CryptoTransaction).save(p);
        } catch (error) {
            return res.status(500).send({
                msg: "Failed to save transaction",
                code: 500
            });
        }

        res.status(200).send(p);
    }

    @Post("checkPayment")
    private async checkPayment(req: Request, res: Response) {

        const user_id = res.locals.jwtPayload.userId;

        const { uuid } = req.body;
        let p: CryptoTransaction;

        try {
            p = await getRepository(CryptoTransaction).findOneOrFail(uuid);
        } catch (error) {
            console.error(error);
            res.status(404).send();
            return;
        }

        if (p.status !== TransactionStatus.PENDING || p.user_id !== user_id) {
            res.status(400).send();
            return;
        }

        let r;

        try {
            /* tslint:disable max-line-length */
            r = await axios.get(`https://block.io/api/v2/get_address_balance/?api_key=${config.blockio.api_keys[p.currency]}&addresses=${p.receive_address}`);
            /* tslint:enable max-line-length */
        } catch (error) {
            console.error(error);
            res.status(500).send();
        }

        const { status, data } = await r.data;
        if (status !== "success") {
            res.status(400).send();
            return;
        }

        const f1 = parseFloat(data.available_balance);
        if (Math.abs(f1 - p.amount_currency) >= 0.0000001) {
            res.status(200).send(p);
            return;
        }

        let user: User;

        try {
            user = await getRepository(User).findOneOrFail(user_id);
        } catch (error) {
            console.error(error);
            res.status(500).send();
            return;
        }

        let deposit = new Deposit();
        deposit.user_id = p.user_id;
        deposit.amount = p.amount_usd;
        deposit.status = DepositStatus.PENDING;
        deposit.transactionId = p.id;
        deposit.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());

        deposit = await getRepository(Deposit).save(deposit);

        Deposit.sendToTelegram(deposit);

        user.payedAllTime += p.amount_usd;
        user.updateDeposits();
        user.updateBalance();

        p.status = TransactionStatus.DONE;
        p.dateDone = new Date(Date.now());

        p = await getRepository(CryptoTransaction).save(p);
        await getRepository(User).save(user);

        try {
            /* tslint:disable max-line-length */
            r = await axios.get(`https://block.io/api/v2/archive_addresses/?api_key=${config.blockio.api_keys[p.currency]}&addresses=${p.receive_address}`);
            /* tslint:enable max-line-length */
        } catch (error) {
            console.error(error);
            res.status(500).send();
        }

        res.status(200).send(p);
    }

    @Post("cancelPendingPayment")
    private async cancelPendingTransaction(req: Request, res: Response) {
        const user_id = res.locals.jwtPayload.userId;

        const { uuid } = req.body;

        if (!uuid) {
            res.status(404).send();
            return;
        }

        const transaction = await getRepository(CryptoTransaction).find({ where: { id: uuid, user_id } });
        if (transaction.length < 1) {
            res.status(404).send();
            return;
        }

        if (transaction[0].status !== TransactionStatus.PENDING) {
            res.status(400).send();
            return;
        }

        await getRepository(CryptoTransaction).delete({ id: uuid });

        res.status(200).send();
    }

}
