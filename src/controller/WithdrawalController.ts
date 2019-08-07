import { ClassMiddleware, Controller, Post } from "@overnightjs/core";
import axios from "axios";
import * as crypto from "crypto";
import { Request, Response } from "express-serve-static-core";
import * as nodemailer from "nodemailer";
import { totp } from "speakeasy";
import { getRepository } from "typeorm";
import config from "../config/config";
import CryptoTransaction from "../entity/CryptoTransaction";
import Transaction, { TransactionStatus, TransactionType } from "../entity/Transaction";
import User from "../entity/User";
import { VerificationToken, VerificationTokenType } from "../entity/VerificationToken";
import Withdrawal, { WithdrawalStatus, WithdrawalType } from "../entity/Withdrawal";
import CryptoNames from "../helpers/CryptoNames";
import { JWTChecker } from "../middlewares/JWTChecker";
import * as blockio from "block_io";
import * as qs from "qs";
import { BestchangeIds } from "../helpers/BestchangeIds";
import { load as htmlLoad } from "cheerio";

import * as bestchange from "node-bestchange";

@Controller("api/withdraw")
@ClassMiddleware([JWTChecker])
export class WithdrawalController {

    @Post("")
    private async create(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        const { amount, currency } = req.body;

        if (!amount) {
            return res.status(400).send({
                msg: "No amount provided",
                code: 400
            });
        }

        const { pendingWithdraws } = await getRepository(Withdrawal)
                            .createQueryBuilder("withdrawal")
                            .select("sum(amount)", "pendingWithdraws")
                            .where("status = '0'")
                            .andWhere("user_id = :id", { id: user.id })
                            .andWhere("type = '0'")
                            .getRawOne();

        if (amount > (await user.getFreeDeposit()) + (pendingWithdraws || 0) || amount <= 0) {
            return res.status(400).send({
                msg: "Insufficient balance",
                code: 400
            });
        }
        // } else if (amount < 50) {
        //     return res.status(400).send({
        //         msg: "Minimal withdraw amount is 50$",
        //         code: 400
        //     });
        // }

        const api = await (new bestchange("./cache")).load();
        let rates;

        try {
            rates = await api.getRates().filter(BestchangeIds.visa_usd, BestchangeIds[currency]);
        } catch (e) {
            console.log(e);
            return res.status(400).send({
                msg: "Currency is not supported",
                code: 400,
                currency
            });
        }

        rates = rates.sort((a, b) => a.rateGive - b.rateGive);

        let w_amount = 0;
        let transaction;

        if (currency in CryptoNames) {

            //w_amount = parseFloat((await r.data.ticker.price * amount).toFixed(8));
            //console.log(rates);
            if (rates[0].rateGive === 1) {
                w_amount = rates[0].rateReceive * amount;
            } else {
                w_amount = parseFloat((1 / rates[0].rateGive).toFixed(8)) * amount;
            }

            let address = "";

            switch(currency) {
                case "bitcoin":
                    address = user.bitcoinWallet;
                    break;
                case "litecoin":
                    address = user.litecoinWallet;
                    break;
                case "dogecoin":
                    address = user.dogecoinWallet;
                    break;
                default:
                    return res.status(400).send({
                        msg: "No wallet in user settings for that currency",
                        code: 400
                    });
            }

            transaction = new CryptoTransaction();
            transaction.amount_currency = w_amount;
            transaction.amount_usd = amount;
            transaction.currency = currency;
            transaction.receive_address = address;
            transaction.dateCreated = new Date(Date.now());
            transaction.status = TransactionStatus.PENDING;
            transaction.type = TransactionType.WITHDRAWAL;
            transaction.user_id = id;

            transaction = await getRepository(CryptoTransaction).save(transaction);

            let withdrawal = new Withdrawal();
            withdrawal.amount = transaction.amount_usd;
            withdrawal.status = WithdrawalStatus.PENDING;
            withdrawal.transactionId = transaction.id;
            withdrawal.type = WithdrawalType.WITHDRAW;
            withdrawal.user_id = id;

            withdrawal = await getRepository(Withdrawal).save(withdrawal);
        } else if (currency === "payeer") {

            if (!user.payeerWallet || user.payeerWallet === "") {
                return res.status(400).send({
                    msg: "No payeer wallet",
                    code: 400
                });
            }

            const initParams = {
                ps: 1136053,
                sumIn: amount,
                curIn: "USD",
                curOut: "USD",
                param_ACCOUNT_NUMBER: user.payeerWallet,
                account: config.payeer.account_id,
                apiId: config.payeer.api_id,
                apiPass: config.payeer.secret_key,
            };

            console.log(initParams);

            const r = await axios.post("https://payeer.com/ajax/api/api.php?initOutput", qs.stringify(initParams));

            const resp = await r.data;

            if (resp.errors.length !== 0) {
                return res.status(400).send({
                    msg: "Payout is not possible",
                    code: 400
                });
            }

            transaction = new Transaction();
            transaction.amount_usd = amount;
            transaction.currency = currency;
            transaction.dateCreated = new Date(Date.now());
            transaction.status = TransactionStatus.PENDING;
            transaction.type = TransactionType.WITHDRAWAL;
            transaction.user_id = id;

            transaction = await getRepository(Transaction).save(transaction);

            let withdrawal = new Withdrawal();
            withdrawal.amount = transaction.amount_usd;
            withdrawal.status = WithdrawalStatus.PENDING;
            withdrawal.transactionId = transaction.id;
            withdrawal.type = WithdrawalType.WITHDRAW;
            withdrawal.user_id = id;

            withdrawal = await getRepository(Withdrawal).save(withdrawal);
        } else if (currency === "ethereum") {

            if (!user.ethereumWallet || user.ethereumWallet === "") {
                return res.status(400).send({
                    msg: "No ethereum wallet",
                    code: 400
                });
            }

            if (rates[0].rateGive === 1) {
                w_amount = rates[0].rateReceive * amount;
            } else {
                w_amount = parseFloat((1 / rates[0].rateGive).toFixed(8)) * amount;
            }

            transaction = new CryptoTransaction();
            transaction.amount_usd = amount;
            transaction.amount_currency = w_amount;
            transaction.receive_address = user.ethereumWallet;
            transaction.currency = currency;
            transaction.dateCreated = new Date(Date.now());
            transaction.status = TransactionStatus.PENDING;
            transaction.type = TransactionType.WITHDRAWAL;
            transaction.user_id = id;

            transaction = await getRepository(CryptoTransaction).save(transaction);

            let withdrawal = new Withdrawal();
            withdrawal.amount = transaction.amount_usd;
            withdrawal.status = WithdrawalStatus.PENDING;
            withdrawal.transactionId = transaction.id;
            withdrawal.type = WithdrawalType.WITHDRAW;
            withdrawal.user_id = id;

            withdrawal = await getRepository(Withdrawal).save(withdrawal);
        } else if (currency === "perfectmoney") {

            if (!user.pwWallet || user.pwWallet === "") {
                return res.status(400).send({
                    msg: "No Perfect Money wallet",
                    code: 400
                });
            }

            transaction = new Transaction();
            transaction.amount_usd = amount;
            transaction.currency = currency;
            transaction.dateCreated = new Date(Date.now());
            transaction.status = TransactionStatus.PENDING;
            transaction.type = TransactionType.WITHDRAWAL;
            transaction.user_id = id;

            transaction = await getRepository(Transaction).save(transaction);

            let withdrawal = new Withdrawal();
            withdrawal.amount = transaction.amount_usd;
            withdrawal.status = WithdrawalStatus.PENDING;
            withdrawal.transactionId = transaction.id;
            withdrawal.type = WithdrawalType.WITHDRAW;
            withdrawal.user_id = id;

            withdrawal = await getRepository(Withdrawal).save(withdrawal);
        }

        if (!user.twofa) {
            let token = new VerificationToken();
            token.userId = user.id;
            token.token = crypto.randomBytes(16).toString("hex");
            token.type = VerificationTokenType.WITHDRAW;
            token.transaction_id = transaction.id;

            token = await getRepository(VerificationToken).save(token);

            const transporter = nodemailer.createTransport({
                host: "smtp.yandex.ru",
                port: 465,
                auth: {
                    user: config.mail.username,
                    pass: config.mail.password
                }
            });
            const mailOptions = {
                from: config.mail.username,
                to: user.email,
                subject: `Подтверждение выплаты ${transaction.id}`,
                text: "Здравствуйте,\n\n" +
                    "Пожалуйста перейдите по ссылке для подтверждения выплаты: \nhttps://robofxtrading.net/profile/withdraw_confirmation/"
                    + transaction.id
                    + "/"
                    + token.token
                    + " .\n" };

            try {
                await transporter.sendMail(mailOptions);
            } catch (error) {
                return res.status(500).send({
                    msg: "Failed to send confirmation email. Please contact administrator.",
                    code: 500
                });
            }

            return res.status(200).send(transaction);
        }

        return res.status(200).send(transaction);

    }

    @Post("confirm")
    private async confirm(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const { transaction_id, code } = req.body;

        const user = await getRepository(User).findOne(id);

        console.log(transaction_id);
        console.log(code);

        let token;

        if (!user.twofa) {
            try {
                token = await getRepository(VerificationToken).findOneOrFail(
                    { token: code, transaction_id,
                        type: VerificationTokenType.WITHDRAW }) as VerificationToken;
            } catch (error) {
                return res.status(404).send({
                    msg: "Invalid token",
                    code: 404
                });
            }

        } else {
            if (!totp.verify({ secret: user.twofaSecret, token: code, encoding: "base32", window: 0 })) {
                return res.status(401).send({
                    msg: "Invalid 2FA code",
                    code: 401
                });
            }
        }

        console.log(transaction_id);

        let transaction: any = await getRepository(Transaction).findOne(transaction_id);
        if (!transaction) {
            transaction = await getRepository(CryptoTransaction).findOne(transaction_id);
        }

        if (!transaction) {
            return res.status(404).send({
                msg: "No transaction with that id found",
                code: 404
            });
        }

        const userBalance = await user.getFreeDeposit();

        if (transaction.amount_usd > userBalance) {
            return res.status(401).send({
                msg: "Insufficient balance",
                code: 401
            });
        } 

        let status = true;

        if (transaction.amount_currency) {

            console.log(transaction);

            const block = new blockio(config.blockio.api_keys[transaction.currency], config.blockio.pin);

            try {
                await new Promise((resolve, reject) => {
                  block.withdraw({ amounts: transaction.amount_currency, 
                        to_addresses: transaction.receive_address }, async (e, data) => {
                        if (e) {
                            reject(e);
                        } else {
                            transaction.dateDone = new Date(Date.now());
                            transaction.status = TransactionStatus.DONE;

                            transaction = await getRepository(CryptoTransaction).save(transaction);

                            let withdrawal = await getRepository(Withdrawal).findOne(
                                { where: { transactionId: transaction.id } });
                            withdrawal.amount = transaction.amount_usd;
                            withdrawal.status = WithdrawalStatus.DONE;
                            withdrawal.transactionId = transaction.id;
                            withdrawal.type = WithdrawalType.WITHDRAW;
                            withdrawal.user_id = id;

                            withdrawal = await getRepository(Withdrawal).save(withdrawal);

                            resolve();
                        }
                    });
                });
            }
            catch (e) {
                return res.status(400).send({
                    msg: "Payout is in pending state",
                    code: 400
                });
            }

        } else if (transaction.currency === "payeer") {

            if (!user.payeerWallet || user.payeerWallet === "") {
                return res.status(400).send({
                    msg: "No payeer wallet",
                    code: 400
                });
            }

            const initParams = {
                ps: 1136053,
                sumIn: transaction.amount_usd,
                curIn: "USD",
                curOut: "USD",
                param_ACCOUNT_NUMBER: user.payeerWallet,
                account: config.payeer.account_id,
                apiId: config.payeer.api_id,
                apiPass: config.payeer.secret_key,
                action: "output"
            };

            const r = await axios.post("https://payeer.com/ajax/api/api.php?output", qs.stringify(initParams));

            const resp = await r.data;

            console.log(resp);

            if (resp.errors === true) {
                return res.status(400).send({
                    msg: "Payment is not possible (wait)",
                    code: 400
                });
            }

            transaction.dateDone = new Date(Date.now());
            transaction.status = TransactionStatus.DONE;

            transaction = await getRepository(Transaction).save(transaction);

            let withdrawal = await getRepository(Withdrawal).findOne(
                { where: { transactionId: transaction.id } });
            withdrawal.amount = transaction.amount_usd;
            withdrawal.status = WithdrawalStatus.DONE;
            withdrawal.transactionId = transaction.id;
            withdrawal.type = WithdrawalType.WITHDRAW;
            withdrawal.user_id = id;

            withdrawal = await getRepository(Withdrawal).save(withdrawal);

        } else if (transaction.currency === "perfectmoney") {

            if (!user.pwWallet || user.pwWallet === "") {
                return res.status(400).send({
                    msg: "No Perfect Money wallet",
                    code: 400
                });
            }

            const resp = await axios.get("https://perfectmoney.is/acct/confirm.asp", {
                params: {
                    AccountID: config.perfect_money.account_id,
                    PassPhrase: config.perfect_money.password,
                    Payer_Account: config.perfect_money.payer_wallet,
                    Payee_Account: user.pwWallet,
                    Amount: transaction.amount_usd,
                    PAYMENT_ID: transaction.id
                }
            });

            const $ = htmlLoad(await resp.data);
            if ($("input")[0].attribs.name === "ERROR") {
                console.log($("input")[0].data);
                return res.status(400).send({
                    msg: "Выплата в ожидающем состоянии. Повторите подтверждение позже.",
                    code: 400
                });
            }

            transaction.dateDone = new Date(Date.now());
            transaction.status = TransactionStatus.DONE;

            transaction = await getRepository(Transaction).save(transaction);

            let withdrawal = await getRepository(Withdrawal).findOne(
                { where: { transactionId: transaction.id } });
            withdrawal.amount = transaction.amount_usd;
            withdrawal.status = WithdrawalStatus.DONE;
            withdrawal.transactionId = transaction.id;
            withdrawal.type = WithdrawalType.WITHDRAW;
            withdrawal.user_id = id;

            withdrawal = await getRepository(Withdrawal).save(withdrawal);


        } else {
            res.status(400).send({
                msg: "Currency is not implemented",
                code: 400
            });
        }

        if (token) await getRepository(VerificationToken).remove(token);

        return res.status(200).send();
    }

    @Post("resend-confirm")
    private async resend(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const { transaction_id } = req.body;

        const user = await getRepository(User).findOne(id);

        if (user.twofa) {
            return res.status(400).send({
                msg: "Verify with 2FA",
                code: 400
            });
        }

        let transaction: any = await getRepository(Transaction).findOne(transaction_id) as Transaction;
        if (!transaction) {
            transaction = await getRepository(CryptoTransaction).findOne(transaction_id) as CryptoTransaction;
        }

        if (transaction.status === TransactionStatus.DONE) {
            return res.status(400).send({
                msg: "Transaction already verified",
                code: 400
            });
        }

        let token = await getRepository(VerificationToken).findOne({ where: { transaction_id: transaction.id } });
        if (!token) {
            token = new VerificationToken();
            token.userId = user.id;
            token.token = crypto.randomBytes(16).toString("hex");
            token.type = VerificationTokenType.WITHDRAW;
            token.transaction_id = transaction.id;

            token = await getRepository(VerificationToken).save(token);
        }

        const transporter = nodemailer.createTransport({
            host: "smtp.yandex.ru",
            port: 465,
            auth: {
                user: config.mail.username,
                pass: config.mail.password
            }
        });
        const mailOptions = {
            from: config.mail.username,
            to: user.email,
            subject: `Подтверждение выплаты ${transaction.id}`,
            text: "Здравствуйте,\n\n" +
                "Пожалуйста перейдите по ссылке для подтверждения выплаты: \nhttps://robofxtrading.net/profile/withdraw_confirmation/"
                + transaction.id
                + "/"
                + token.token
                + " .\n" };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            return res.status(500).send({
                msg: "Failed to send confirmation email. Please contact administrator.",
                code: 500
            });
        }

        res.status(200).send();

    }

}
