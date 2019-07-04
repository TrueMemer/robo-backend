import { Controller, Post, ClassMiddleware } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { JWTChecker } from "../middlewares/JWTChecker";

@Controller("api/payment/interkassa")
export class InterkassaController {

    @Post("interaction")
    private async interaction(req: Request, res: Response) {

        console.log(req.body);

    }

}