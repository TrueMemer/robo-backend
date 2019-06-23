import { ClassMiddleware, Controller, Get } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { getRepository } from "typeorm";
import CryptoTransaction from "../entity/CryptoTransaction";
import Deposit from "../entity/Deposit";
import Profit from "../entity/Profit";
import { Referral } from "../entity/Referral";
import Transaction from "../entity/Transaction";
import User from "../entity/User";
import Withdrawal from "../entity/Withdrawal";
import { JWTChecker } from "../middlewares/JWTChecker";

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
                                .select("sum(withdrawal.amount)")
                                .getRawOne();

        me.withdrawedTotal = sum != null ? sum : 0;
        me.freeDeposit = (me.referralTotalIncome + me.profitTotal) - me.withdrawedTotal;
        me.balance = me.freeDeposit + me.workingDeposit + me.pendingDeposit;

        res.send(me);
    }

    @Get("addBalanceHistory")
    private async addBalanceHistory(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const cryptoHistory = await getRepository(CryptoTransaction).find(
            { where: { user_id: id }, select: ["id", "status", "dateCreated", "dateDone", "currency", "amount_usd"]});

        const history = await getRepository(Transaction).find(
            { where: { user_id: id }, select: ["id", "status", "dateCreated", "dateDone", "currency", "amount_usd"]});

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

        const profits = await getRepository(Profit).find({ where: { user_id: id }});

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
                                .andWhere("profit.referral_id = :id2", { id2: u.id })
                                .select("sum(profit.profit)", "income")
                                .getRawOne();

            ref1.workingDepo = u.workingDeposit;
            ref1.username = u.username;
            ref1.id = u.id;
            ref1.income = income != null ? income : 0;
            ref1.level = 1;

            const second = await getRepository(Referral).find({ where: { referrer: u.id } });

            for (const s of second) {

                const u2: User = await getRepository(User).findOne(s.referral);

                const ref2: any = {};

                const { secondIncome } = await getRepository(Profit)
                                    .createQueryBuilder("profit")
                                    .where("profit.user_id = :id", { id: u.id })
                                    .andWhere("profit.referral_id = :id2", { id2: u2.id })
                                    .select("sum(profit.profit)", "income")
                                    .getRawOne();

                const workingDepo2 = await u2.getFreeDeposit();

                ref2.workingDepo = u.workingDeposit;
                ref2.username = u2.username;
                ref2.id = u2.id;
                ref2.income = secondIncome != null ? secondIncome : 0;
                ref2.level = 2;

                resp.push(ref2);
            }

            resp.push(ref1);
        }

        return res.status(200).send(resp);
    }

}
