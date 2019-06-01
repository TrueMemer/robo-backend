import { Request, Response } from "express-serve-static-core";
import { getRepository } from "typeorm";
import { User } from "../entity/User";

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

}

export default ProfileController;