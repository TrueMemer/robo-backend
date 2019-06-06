import { Request, Response } from "express-serve-static-core";
import CryptoTransaction, { TransactionType, TransactionStatus } from "../entity/CryptoTransaction";
import { validate } from "class-validator";
import { getRepository } from "typeorm";
import config from "../config/config";
import axios from "axios";
import { User } from "../entity/User";
import moment = require("moment");
import Deposit, { DepositStatus } from "../entity/Deposit";

const CryptoNames = {
    "bitcoin": "BTC",
    "litecoin": "LTC",
    "dogecoin": "DOGE",
    "bitcoin_testnet": "BTC",
    "litecoin_testnet": "LTC",
    "dogecoin_testnet": "DOGE"
};

export default class BlockIOController {

    static createPayment = async (req: Request, res: Response) => {
        
        const user_id = res.locals.jwtPayload.userId;

        var p: CryptoTransaction = new CryptoTransaction();

        let { currency, amount_usd } = req.body;

        p.user_id = user_id;
        p.currency = currency;
        p.amount_usd = amount_usd;

        const errors = await validate(p);
        if (errors.length > 0) {
            return res.status(400).send({
                msg: "Validation error",
                code: 400,
                errors: errors
            });
        }

        let r;

        try {
            r = await axios.get(`https://api.cryptonator.com/api/ticker/usd-${CryptoNames[p.currency]}`);
        } catch (error) {
            return res.status(400).send({
                msg: "No currency with that name was found",
                code: 400,
                currency: p.currency
            });
        }

        p.amount_currency = (await r.data.ticker.price * p.amount_usd);

        p.dateCreated = new Date(Date.now());

        try {
            r = await axios.get(`https://block.io/api/v2/get_new_address/?api_key=${config.blockio.api_keys[p.currency]}`);
        } catch (error) {
            return res.status(400).send({
                msg: "This currency is not supported",
                code: 400,
                currency: p.currency
            });
        }

        let { status, data } = await r.data;
        if (status != "success") {
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
        }
        catch (error) {
            return res.status(500).send({
                msg: "Failed to save transaction",
                code: 500
            });
        }

        res.status(200).send(p);
    };

    static checkPayment = async (req: Request, res: Response) => {

        const user_id = res.locals.jwtPayload.userId;

        let { uuid } = req.body;
        let p: CryptoTransaction;

        try {
            p = await getRepository(CryptoTransaction).findOneOrFail(uuid);
        }
        catch (error) {
            console.error(error);
            res.status(404).send();
            return;
        }

        if (p.status != TransactionStatus.PENDING || p.user_id != user_id) {
            res.status(400).send();
            return;
        }

        let r;

        try {
            r = await axios.get(`https://block.io/api/v2/get_address_balance/?api_key=${config.blockio.api_keys[p.currency]}&addresses=${p.receive_address}`);
        } catch (error) {
            console.error(error);
            res.status(500).send();
        }

        let { status, data } = await r.data;
        if (status != "success") {
            res.status(400).send();
            return;
        }

        let f1 = parseFloat(data.available_balance);
        if (Math.abs(f1 - p.amount_currency) >= 0.0000001) {
            res.status(200).send(p);
            return;
        }

        let user: User;

        try {
            user = await getRepository(User).findOneOrFail(user_id);
        } catch(error) {
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

        user.payedAllTime += p.amount_usd;
        user.updateDeposits();
        user.updateBalance();

        p.status = TransactionStatus.DONE;
        p.dateDone = new Date(Date.now());

        p = await getRepository(CryptoTransaction).save(p);
        await getRepository(User).save(user);

        try {
            r = await axios.get(`https://block.io/api/v2/archive_addresses/?api_key=${config.blockio.api_keys[p.currency]}&addresses=${p.receive_address}`);
        } catch (error) {
            console.error(error);
            res.status(500).send();
        }

        res.status(200).send(p);
    };

    static cancelPendingTransaction = async (req: Request, res: Response) => {
        const user_id = res.locals.jwtPayload.userId;

        let { uuid } = req.body;

        if(!uuid) {
            res.status(404).send();
            return;
        }
        
        let transaction = await getRepository(CryptoTransaction).find({ where: { id: uuid, user_id: user_id } });
        if (transaction.length < 1) {
            res.status(404).send();
            return;
        }

        if (transaction[0].status != TransactionStatus.PENDING) {
            res.status(400).send();
            return;
        }

        await getRepository(CryptoTransaction).delete({ id: uuid });

        res.status(200).send();
    };

}