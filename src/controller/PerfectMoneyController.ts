import { Request, Response } from "express-serve-static-core";

export default class PerfectMoneyController {

    static status = (req: Request, res: Response) => {
        console.log(req.body);
    }

}