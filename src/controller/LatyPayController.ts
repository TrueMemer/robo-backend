import { Controller, Post } from "@overnightjs/core";
import { Request, Response } from "express";

@Controller("api/payment/latypay")
export class LatyPayController {

    @Post()
    private async status(req: Request, res: Response) {
        console.log(req.body);
    }

    @Post()
    private async success(req: Request, res: Response) {
        console.log(req.body);
    }

    @Post()
    private async fail(req: Request, res: Response) {
        console.log(req.body);
    }

}
