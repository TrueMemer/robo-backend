import { ClassMiddleware, Middleware, Controller, Get, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import * as twister from "mersenne-twister";
import { getRepository } from "typeorm";
import Profit, { ProfitType } from "../entity/Profit";
import { ShopEntry, ShopEntryType } from "../entity/ShopEntry";
import User from "../entity/User";
import { JWTChecker } from "../middlewares/JWTChecker";
import { RoleChecker } from "../middlewares/RoleChecker";

@Controller("api/shop")
export class ShopController {

    private chance = 10;
    private bet = 200;
    private bank = ((this.bet * this.chance) / 100) + 1;

    @Get("getChances")
    @Middleware([JWTChecker, RoleChecker(["ADMIN"])])
    private async getChances(req: Request, res: Response) {
        return res.send({
            chance: this.chance,
            bet: this.bet,
            bank: this.bank
        });
    }

    @Post("changeChanceAndBet")
    @Middleware([JWTChecker, RoleChecker(["ADMIN"])])
    private async changeChance(req: Request, res: Response) {

        if (req.body.chance) {
            this.chance = req.body.chance;
        }

        if (req.body.bet) {
            this.chance = req.body.chance;
        }

        return res.send();

    }

    @Get("feedRobo")
    @Middleware([JWTChecker])
    private async feed(req: Request, res: Response) {

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        if (await user.getFreeDeposit() < 1) {
            return res.status(400).send({
                msg: "Insufficient balance",
                code: 400
            });
        }

        const random = new twister();
        const number = random.random_int();
        let zerochance = random.random_int();
        zerochance = zerochance % 2;
        console.log(number);

        let award = 0;
        if (zerochance === 0) {
            award = number % Math.round((this.bank - 1) / 2);
        } else {
            award = number % Math.round(((this.bet * this.chance) / 100 - this.bank) / 2);
        }

        if ((award !== 1) && (award !== 2)) {
            award = 0;
        }

        if ((this.bank - award) <= 0) {
            award = 0;
        }

        this.bank -= award;

        let fee = new Profit();

        fee.user_id = id;
        fee.profit = -1;
        fee.type = ProfitType.OTHER;
        fee.date = new Date (Date.now());

        fee = await getRepository(Profit).save(fee);

        if (award > 0) {
            let a = new Profit();
            a.profit = award;
            a.type = ProfitType.BONUS_FEEDROBO;
            a.user_id = user.id;
            a.date = new Date(Date.now());

            a = await getRepository(Profit).save(a);
        }

        return res.status(200).send({
            result: award
        });

    }

    @Get("")
    private async getEntries(req: Request, res: Response) {
        return res.status(200).send(await getRepository(ShopEntry).find());
    }

    @Post("")
    @Middleware([JWTChecker])
    private async buy(req: Request, res: Response) {

        const { entry_id } = req.body;

        if (!entry_id) {
            return res.status(400).send({
                msg: "No shop entry id",
                code: 400
            });
        }

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        const { bonuses } = await getRepository(Profit)
                                .createQueryBuilder("profit")
                                .where("profit.user_id = :id", { id: user.id })
                                .where("profit.type = '2'")
                                .orWhere("profit.type = '5'")
                                .select("sum(profit.profit)", "bonuses")
                                .getRawOne();

        const entry = await getRepository(ShopEntry).findOne(entry_id);

        if (!entry) {
            return res.status(404).send({
                msg: "No shop entry with that id",
                code: 404
            });
        }

        if (bonuses < entry.price) {
            return res.status(400).send({
                msg: "Insufficient balance",
                code: 400
            });
        }

        let price = new Profit();
        price.profit = -entry.price;
        price.type = ProfitType.BONUS;
        price.user_id = user.id;

        price = await getRepository(Profit).save(price);

        switch (entry.type) {

            case ShopEntryType.MONEY:
                let award = new Profit();
                award.type = ProfitType.OTHER;
                award.profit = entry.award;
                award.user_id = user.id;

                award = await getRepository(Profit).save(award);

                break;

            case ShopEntryType.REFERRAL:
                if (user.referral_level >= entry.award) {
                    return res.status(400).send({
                        msg: "You already purchased this item",
                        code: 400
                    });
                }

                user.referral_level = entry.award;

                await getRepository(User).save(user);

                break;

            case ShopEntryType.OTHER:

                break;

        }

        return res.status(200).send();

    }


}
