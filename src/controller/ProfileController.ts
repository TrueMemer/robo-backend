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
        me.profitTotal = 0;
        {
            const profits = await getRepository(Profit).find({ where: { user_id: me.id }, order: { ticket: "ASC" } });

            for (const profit of profits) {
                me.profitTotal += profit.profit;
            }
        }

        const { sum } = await getRepository(Withdrawal)
                                .createQueryBuilder("withdrawal")
                                .where("withdrawal.user_id = :id", { id: me.id })
                                .select("sum(withdrawal.amount)")
                                .getRawOne();

        me.withdrawedTotal = sum != null ? sum : 0;
        me.freeDeposit = me.profitTotal - me.withdrawedTotal;
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
            const u: any = await getRepository(User).findOne(r.referral, { select: ["id", "username"] });

            const { income } = await getRepository(Profit)
                                .createQueryBuilder("profit")
                                .where("profit.user_id = :id", { id: user.id })
                                .andWhere("profit.referral_id = :id2", { id2: u.id })
                                .select("sum(profit.profit)", "income")
                                .getRawOne();

            u.income = income;

            resp.push(u);
        }

        return res.status(200).send(resp);
    }

}
