import { Controller, Post, ClassMiddleware, Get } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { JWTChecker } from "../middlewares/JWTChecker";
import { getRepository } from "typeorm";
import User from "../entity/User";
import Profit, { ProfitType } from "../entity/Profit";
import * as twister from "mersenne-twister";

@Controller("api/shop")
@ClassMiddleware([JWTChecker])
export class ShopController {

    private chance = 10;
    private bet = 200;
    private bank = this.bet / this.chance;

    @Post("")
    private async buy(req: Request, res: Response) {
        


    }

    @Get("feedRobo")
    private async feed(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        if (await user.getFreeDeposit() < 1) {
            return res.status(400).send({
                msg: "Insufficient balance",
                code: 400
            });
        }

        let fee = new Profit();

        fee.user_id = id;
        fee.profit = -1;
        fee.type = ProfitType.OTHER;

        fee = await getRepository(Profit).save(fee);

        const random = new twister();
        const number = random.random_int()

        console.log(number);

        const award = number % 3;

        let a = new Profit();
        a.profit = award;
        a.type = ProfitType.BONUS;
        a.user_id = user.id;

        a = await getRepository(Profit).save(a);

        return res.status(200).send({
            result: award
        });

    }

}