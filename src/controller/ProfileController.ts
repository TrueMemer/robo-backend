import { Request, Response } from "express-serve-static-core";
import { getRepository } from "typeorm";
import { User } from "../entity/User";
import CryptoTransaction from "../entity/CryptoTransaction";

class ProfileController {

    static me = async (req: Request, res: Response) => {
        const id = res.locals.jwtPayload.userId;

        const rep = getRepository(User);
        let me;

        try {
            me = await rep.findOneOrFail(id);
        }
        catch (error) {
            console.error(error);
            return res.status(404).send();
        }

        res.send(me);
    };

    static addBalanceHistory = async (req: Request, res: Response) => {
        const id = res.locals.jwtPayload.userId;

        const history = await getRepository(CryptoTransaction).find({ where: { user_id: id }, select: ["id", "status", "dateCreated", "dateDone", "currency", "amount_usd"]});

        return res.status(200).send(history);
    }

}

export default ProfileController;