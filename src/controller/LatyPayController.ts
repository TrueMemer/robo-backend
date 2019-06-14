import { Request, Response } from "express";

export default class LatyPayController {

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