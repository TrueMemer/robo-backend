import { Request, Response } from "express-serve-static-core";

export default class PayeerController {

    static ips = [
        "185.71.65.92",
        "185.71.65.189",
        "149.202.17.210"
    ];

    static status = async (req: Request, res: Response) => {
        if (!PayeerController.ips.includes(req.ip)) {
            return res.status(401).send();
        }

        console.log(req.body);

        return req.body["order_id"] + "|success";
    }

    static success = async (req: Request, res: Response) => {
        if (!PayeerController.ips.includes(req.ip)) {
            return res.status(401).send();
        }

        console.log(req.body);

        return req.body["order_id"] + "|success";
    }

    static fail = async (req: Request, res: Response) => {
        if (!PayeerController.ips.includes(req.ip)) {
            return res.status(401).send();
        }

        console.log(req.body);

        return req.body["order_id"] + "|success";
    }
}