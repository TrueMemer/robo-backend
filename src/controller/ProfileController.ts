import { ClassMiddleware, Controller, Get, Patch, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { toDataURL } from "qrcode";
import { generateSecret, otpauthURL, totp } from "speakeasy";
import { getRepository, Any } from "typeorm";
import AuthorizationEntry from "../entity/AuthorizationEntry";
import CryptoTransaction from "../entity/CryptoTransaction";
import Deposit, { DepositStatus } from "../entity/Deposit";
import Profit, { ProfitType } from "../entity/Profit";
import { Referral } from "../entity/Referral";
import Transaction, { TransactionType } from "../entity/Transaction";
import User from "../entity/User";
import Withdrawal, { WithdrawalType } from "../entity/Withdrawal";
import { JWTChecker } from "../middlewares/JWTChecker";
import UserView from "../entity/UserView";
import * as moment from "moment";
import axios from "axios"; 

@Controller("api/profile")
@ClassMiddleware([JWTChecker])
export class ProfileController {

    @Get("")
    private async me(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const rep = getRepository(User);
        let me: User;

        try {
            me = await rep.findOneOrFail(id);
        } catch (error) {
            return res.status(401).send({
                msg: "Unauthorized (expired token)",
                code: 401
            });
        }

        const { ordersTotalIncome } = await getRepository(Profit)
                                    .createQueryBuilder("profit")
                                    .where("profit.type = '0'")
                                    .andWhere("profit.user_id = :id", { id: me.id })
                                    .select("sum(profit.profit)", "ordersTotalIncome")
                                    .getRawOne();

        const { referralTotalIncome } = await getRepository(Profit)
                                    .createQueryBuilder("profit")
                                    .where("profit.type = '1'")
                                    .andWhere("profit.user_id = :id", { id: me.id })
                                    .select("sum(profit.profit)", "referralTotalIncome")
                                    .getRawOne();

        me.referralTotalIncome = referralTotalIncome != null ? referralTotalIncome : 0;
        me.profitTotal = ordersTotalIncome != null ? ordersTotalIncome : 0;

        const { sum } = await getRepository(Withdrawal)
                                .createQueryBuilder("withdrawal")
                                .where("withdrawal.user_id = :id", { id: me.id })
                                .andWhere("withdrawal.type = '0'")
				                .andWhere("withdrawal.status = '1'")
                                .select("sum(withdrawal.amount)")
                                .getRawOne();

        const { bonusIncome } = await getRepository(Profit)
                                    .createQueryBuilder("profit")
                                    .where("profit.type = '2'")
                                    .andWhere("profit.user_id = :id", { id: me.id })
                                    .select("sum(profit.profit)", "bonusIncome")
                                    .getRawOne();

        const { bonusWithdrawed } = await getRepository(Withdrawal)
                                        .createQueryBuilder("withdrawal")
                                        .where("withdrawal.user_id = :id", { id: me.id })
                                        .andWhere("withdrawal.type = '2'")
                                        .select("sum(withdrawal.amount)", "bonusWithdrawed")
                                        .getRawOne();

        me.withdrawedTotal = sum != null ? sum : 0;
        me.freeDeposit = await me.getFreeDeposit();
        me.balance = me.freeDeposit + me.workingDeposit + me.pendingDeposit;
        me.bonus = bonusIncome != null ? bonusIncome : 0;
        me.workingDeposit = await me.getWorkingDepo();

        res.send(me);
    }

    @Post("enable-2fa")
    private async enable2FA(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        let user = await getRepository(User).findOne(id);

        let url;

        if (user.twofaSecret === null) {
            const secret = generateSecret({ length: 20 });
            url = otpauthURL({ secret: secret.base32,
                label: user.username, issuer: "ROBO FX TRADING", encoding: "base32" });
            user.twofaSecret = secret.base32;

            url = await toDataURL(url);
        } else {
            url = otpauthURL({ secret: user.twofaSecret,
                label: user.username, issuer: "ROBO FX TRADING", encoding: "base32" });

            url = await toDataURL(url);
        }

        user = await getRepository(User).save(user);

        return res.status(200).send({
            secret: url
        });
    }

    @Post("confirm-2fa")
    private async confirm2FA(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const { code } = req.body;

        if (!code || code === "") {
            return res.status(400).send({
                msg: "Invalid 2FA code",
                code: 400
            });
        }

        const user = await getRepository(User).findOne(id);

        if (user.twofa) {
            return res.status(400).send({
                msg: "2FA already enabled",
                code: 400
            });
        }

        if (!totp.verify({ secret: user.twofaSecret, token: code, encoding: "base32" })) {
            return res.status(400).send({
                msg: "Invalid 2FA code",
                code: 400
            });
        }

        user.twofa = true;

        await getRepository(User).save(user);

        res.status(200).send();
    }

    @Post("disable-2fa")
    private async disable2FA(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const { code } = req.body;

        if (!code) {
            return res.status(401).send({
                msg: "No 2FA code",
                code: 401
            });
        }

        let user = await getRepository(User).findOne(id);

        if (!totp.verify({ secret: user.twofaSecret, token: code, encoding: "base32", window: 0 })) {
            return res.status(401).send({
                msg: "Invalid 2FA code",
                code: 401
            });
        }

        user.twofa = false;
        user.twofaSecret = null;

        user = await getRepository(User).save(user);

        return res.status(200).send();
    }

    @Patch("patch")
    private async patch(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        for (const key in req.body) {
            if (user.hasOwnProperty(key)) {
                user[key] = req.body[key];
            }
        }

        await getRepository(User).save(user);

        return res.status(200).send();
    }

    @Get("addBalanceHistory")
    private async addBalanceHistory(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const cryptoHistory = await getRepository(CryptoTransaction).find(
            { where:
                { user_id: id, type: TransactionType.PAYIN },
                select: ["id", "status", "dateCreated", "dateDone", "currency", "amount_usd"]
            });

        const history = await getRepository(Transaction).find(
            { where:
                { user_id: id, type: TransactionType.PAYIN },
                select: ["id", "status", "dateCreated", "dateDone", "currency", "amount_usd"]
            });

        return res.status(200).send(history.concat(cryptoHistory));
    }

    @Get("getDeposits")
    private async deposits(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const deposits = await getRepository(Deposit).find({ where: { user_id: id }});

        return res.status(200).send(deposits);
    }

    @Get("getProfits")
    private async profits(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const { type } = req.query;

        let profits;

        if (type) {

            const types: string[] = (type as string).split(",");

            profits = await getRepository(Profit).find({ where: {
                user_id: id,
                type: Any(types)
            }});

        } else {
            profits = await getRepository(Profit).find({ where: { user_id: id }});
        }

        return res.status(200).send(profits);
    }

    @Get("getRefs")
    private async refs(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        const refs = await getRepository(Referral).find({ where: { referrer: user.id } });

        const resp: any[] = [];

        for (const r of refs) {
            const u: User = await getRepository(User).findOne(r.referral);

            const ref1: any = {};

            const { income } = await getRepository(Profit)
                                .createQueryBuilder("profit")
                                .where("profit.user_id = :id", { id: user.id })
                                .andWhere("profit.type = '1'")
                                .andWhere("profit.referral_id = :id2", { id2: u.id })
                                .select("sum(profit.profit)", "income")
                                .getRawOne();

            const { bonusIncome } = await getRepository(Profit)
                                .createQueryBuilder("profit")
                                .where("profit.user_id = :id", { id: user.id })
                                .andWhere("profit.type = '2'")
                                .andWhere("profit.referral_id = :id2", { id2: u.id })
                                .select("sum(profit.profit)", "bonusIncome")
                                .getRawOne();

            ref1.workingDepo = u.workingDeposit;
            ref1.username = u.username;
            ref1.referrer = u.referral;
            ref1.id = u.id;
            ref1.income = income != null ? income : 0;
            ref1.level = 1;
            ref1.bonus = bonusIncome != null ? bonusIncome : 0;
            ref1.registrationDate = u.createdAt;

            const second = await getRepository(Referral).find({ where: { referrer: u.id } });

            for (const s of second) {

                const u2: User = await getRepository(User).findOne(s.referral);

                const ref2: any = {};

                const { secondIncome } = await getRepository(Profit)
                                    .createQueryBuilder("profit")
                                    .where("profit.user_id = :id", { id: user.id })
                                    .andWhere("profit.type = '1'")
                                    .andWhere("profit.referral_id = :id2", { id2: u2.id })
                                    .select("sum(profit.profit)", "secondIncome")
                                    .getRawOne();

                const { secondBonusIncome } = await getRepository(Profit)
                                    .createQueryBuilder("profit")
                                    .where("profit.user_id = :id", { id: user.id })
                                    .andWhere("profit.type = '2'")
                                    .andWhere("profit.referral_id = :id2", { id2: u2.id })
                                    .select("sum(profit.profit)", "secondBonusIncome")
                                    .getRawOne();

                ref2.workingDepo = u2.workingDeposit;
                ref2.username = u2.username;
                ref2.referrer = u2.referral;
                ref2.id = u2.id;
                ref2.income = secondIncome != null ? secondIncome : 0;
                ref2.level = 2;
                ref2.bonus = secondBonusIncome != null ? secondBonusIncome : 0;
                ref2.registrationDate = u2.createdAt;

                resp.push(ref2);

                const third = await getRepository(Referral).find({ where: { referrer: u2.id } });

                for (const t of third) {

                    const u3: User = await getRepository(User).findOne(t.referral);

                    const ref3: any = {};

                    const { thirdIncome } = await getRepository(Profit)
                                        .createQueryBuilder("profit")
                                        .where("profit.user_id = :id", { id: user.id })
                                        .andWhere("profit.type = '1'")
                                        .andWhere("profit.referral_id = :id2", { id2: u3.id })
                                        .select("sum(profit.profit)", "income")
                                        .getRawOne();

                    const { thirdBonusIncome } = await getRepository(Profit)
                                        .createQueryBuilder("profit")
                                        .where("profit.user_id = :id", { id: user.id })
                                        .andWhere("profit.type = '2'")
                                        .andWhere("profit.referral_id = :id2", { id2: u3.id })
                                        .select("sum(profit.profit)", "thirdBonusIncome")
                                        .getRawOne();

                    ref3.workingDepo = u3.workingDeposit;
                    ref3.username = u3.username;
                    ref3.referrer = u3.referral;
                    ref3.id = u3.id;
                    ref3.income = thirdIncome != null ? thirdIncome : 0;
                    ref3.level = 3;
                    ref3.bonus = thirdBonusIncome != null ? thirdBonusIncome : 0;
                    ref3.registrationDate = u3.createdAt;

                    resp.push(ref3);

                }
            }

            resp.push(ref1);
        }

        return res.status(200).send(resp);
    }

    @Get("getWithdraws")
    private async withdraws(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const withdraws = await getRepository(Withdrawal).find({
            where: { user_id: id, type: WithdrawalType.WITHDRAW }
        });

        return res.status(200).send(withdraws);
    }

    @Get("getReinvests")
    private async reinvests(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const reinvests = await getRepository(Withdrawal).find({
            where: { user_id: id, type: WithdrawalType.REINVEST }
        });

        return res.status(200).send(reinvests);
    }

    @Get("getAuthorizations")
    private async authorizations(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const auth = await getRepository(AuthorizationEntry).find({
            where: { user_id: id }
        });

        return res.status(200).send(auth);
    }

    @Get("returnDeposits")
    private async return(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const { workingDepo } = await getRepository(Deposit)
                                    .createQueryBuilder("deposit")
                                    .select("sum(amount)", "workingDepo")
                                    .where("user_id = :id", { id })
                                    .andWhere("status = :status", { status: DepositStatus.WORKING })
                                    .getRawOne();
	
	    if (workingDepo < 1 || !workingDepo) return res.status(200).send();

        if (id == 846) {
            return res.status(401).send({
                msg: "Can't return deposit yet",
                code: 401
            });
        }

        let p = new Profit();
        p.type = ProfitType.DEPOSIT_RETURN;
        p.user_id = id;
        p.profit = workingDepo - (workingDepo * 0.3);

        p = await getRepository(Profit).save(p);

        const r = await getRepository(Deposit)
                            .createQueryBuilder("deposit")
                            .update(Deposit)
                            .set({ status: DepositStatus.EXPIRED })
                            .where("user_id = :id", { id })
                            .execute();

        const user = await getRepository(User).findOne(id);
        user.updateDeposits();
        await getRepository(User).save(user);

        console.log(r);

        res.status(200).send();

    }

    @Post("bindTelegram")
    private async bindTelegram(req: Request, res: Response) {

        // 192.168.0.117/api/user.BindTelegram

        const user_id = req.body.user_id;
        const special_code = req.body.special_code;

        let resp = await axios.post("http://192.168.0.117:3001/api/user.BindTelegram", {
            id_user: user_id,
            special_code,
            token: "Fo84lsnyUgZjI6mQOfUhptOA7B64DRtZCVZ084dRxarn3NyPS9sqMG5ASgs255fA"
        }, { validateStatus: () => { return true; } });

        if (resp.status >= 400) {
             console.log(await resp.status)
             return res.status(400).send({
                 msg: "Ошибка",
                 code: 400
             });
        }

        return res.send();

    }

}
