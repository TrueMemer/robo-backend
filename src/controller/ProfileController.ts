import { Request, Response } from "express-serve-static-core";
import { getRepository } from "typeorm";
import { User } from "../entity/User";
import CryptoTransaction from "../entity/CryptoTransaction";
import Deposit from "../entity/Deposit";

export default class ProfileController {

    static me = async (req: Request, res: Response) => {
        const id = res.locals.jwtPayload.userId;

        const rep = getRepository(User);
        let me;

        try {
            me = await rep.findOneOrFail(id);
        }
        catch (error) {
            return res.status(401).send({
                msg: "Unauthorized (expired token)",
                code: 401
            });
        }

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

}