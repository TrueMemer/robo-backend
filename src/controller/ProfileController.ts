import { Request, Response } from "express-serve-static-core";
import { getRepository, getConnection } from "typeorm";
import User from "../entity/User";
import CryptoTransaction from "../entity/CryptoTransaction";
import Deposit from "../entity/Deposit";
import Profit from "../entity/Profit";

export default class ProfileController {

    static me = async (req: Request, res: Response) => {
        const id = res.locals.jwtPayload.userId;

        const rep = getRepository(User);
        let me: User;

        try {
            me = await rep.findOneOrFail(id);
        }
        catch (error) {
            return res.status(401).send({
                msg: "Unauthorized (expired token)",
                code: 401
            });
        }

        me.profitTotal = <number>await getConnection()
                            .createQueryBuilder()
                            .where("profit.user_id = :id", { id: me.id })
                            .select("sum(profit.amount) from profit")
                            .getRawOne();

        me.withdrawedTotal = <number>await getConnection()
                                .createQueryBuilder()
                                .where("widthdrawal.user_id = :id", { id: me.id })
                                .select("sum(withdrawal.amount) from withdrawal")
                                .getRawOne();

        res.send(me);
    };

    static addBalanceHistory = async (req: Request, res: Response) => {
        const id = res.locals.jwtPayload.userId;

        const history = await getRepository(CryptoTransaction).find({ where: { user_id: id }, select: ["id", "status", "dateCreated", "dateDone", "currency", "amount_usd"]});

        return res.status(200).send(history);
    }

    static deposits = async (req: Request, res: Response) => {
        const id = res.locals.jwtPayload.userId;

        const deposits = await getRepository(Deposit).find({ where: { user_id: id }});

        return res.status(200).send(deposits);
    }

    static profits = async (req: Request, res: Response) => {
        const id = res.locals.jwtPayload.userId;

        const profits = await getRepository(Profit).find({ where: { user_id: id }});

        return res.status(200).send(profits);
    }

}