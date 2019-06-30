import { Controller, Post, ClassMiddleware } from "@overnightjs/core";
import { Request } from "express-serve-static-core";
import { JWTChecker } from "../middlewares/JWTChecker";

@Controller("api/shop")
@ClassMiddleware([JWTChecker])
export class ShopController {

    @Post("")
    private async buy(req: Request, res: Response) {
        


    }

}