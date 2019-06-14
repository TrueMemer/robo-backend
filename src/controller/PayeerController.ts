import { Request, Response } from "express-serve-static-core";

export default class PayeerController {
    static status = async (req: Request, res: Response) => {
        console.log(req.body);
    }

    static success = async (req: Request, res: Response) => {
        console.log(req.body);
    }

    static fail = async (req: Request, res: Response) => {
        console.log(req.body);
    }
}