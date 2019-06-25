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

        if (amount > user.getFreeDeposit() || amount <= 0) {
            return res.status(400).send({
                msg: "Insufficient balance",
                code: 400
            });
        } else if (amount < 50) {
            return res.status(400).send({
                msg: "Minimal withdraw amount is 50$",
                code: 400
            });
        }

        let w_amount = 0;
        let transaction;

        if (currency in CryptoNames) {
            let r;
            try {
                r = await axios.get(`https://api.cryptonator.com/api/ticker/usd-${CryptoNames[currency]}`);
            } catch (error) {
                return res.status(400).send({
                    msg: "No currency with that name was found",
                    code: 400,
                    currency
                });
            }

            w_amount = parseFloat((await r.data.ticker.price * amount).toFixed(8));

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
        }

        if (!user.twofa) {
            let token = new VerificationToken();
            token.userId = user.id;
            token.token = crypto.randomBytes(16).toString("hex");
            token.type = VerificationTokenType.WITHDRAW;
            token.transaction_id = transaction.id;

            token = await getRepository(VerificationToken).save(token);

            const transporter = nodemailer.createTransport({
                service: config.mail.service,
                auth: {
                    user: config.mail.username,
                    pass: config.mail.password
                }
            });
            const mailOptions = {
                from: "robofxtrading19@gmail.com",
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

        if (!user.twofa) {
            let token;

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

            await getRepository(VerificationToken).remove(token);
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

        let status = true;

        if (transaction.amount_currency) {

            console.log(transaction);

            const block = new blockio(config.blockio.api_keys[transaction.currency], config.blockio.pin);

            block.withdraw({ amounts: transaction.amount_currency, 
                to_addresses: transaction.receive_address }, async (e, data) => {
                if (e) {
                    console.log(e);
                    status = false;
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
                }
            });

        } else {
            res.status(400).send({
                msg: "Currency is not implemented",
                code: 400
            });
        }

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
            service: config.mail.service,
            auth: {
                user: config.mail.username,
                pass: config.mail.password
            }
        });
        const mailOptions = {
            from: "robofxtrading19@gmail.com",
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
