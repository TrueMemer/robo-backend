import { ClassMiddleware, Controller, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import moment = require("moment");
import { getRepository } from "typeorm";
import Deposit, { DepositStatus, DepositType } from "../entity/Deposit";
import User from "../entity/User";
import Withdrawal, { WithdrawalStatus, WithdrawalType } from "../entity/Withdrawal";
import { JWTChecker } from "../middlewares/JWTChecker";

@Controller("api/reinvest")
@ClassMiddleware([JWTChecker])
export class ReinvestController {

    @Post("")
    private async reinvest(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;
        const user = await getRepository(User).findOne(id);

        const { amount } = req.body;

        const freeDeposit = await user.getFreeDeposit();

        if (amount < 50 || amount <= 0 || amount > freeDeposit) {
            return res.status(400).send();
        }

        // Вывод по реинвесту
        let w = new Withdrawal();

        w.amount = amount;
        w.status = WithdrawalStatus.DONE;
        w.transactionId = "reinvest";
        w.type = WithdrawalType.REINVEST;
        w.user_id = id;

        w = await getRepository(Withdrawal).save(w);

        let d = new Deposit();

        d.amount = w.amount;
        d.pendingEndTime = new Date(moment().utc().hours(20).minutes(59).add(48, "hours").format());
        d.status = DepositStatus.PENDING;
        d.transactionId = "reinvest";
        d.type = DepositType.REINVEST;
        d.user_id = id;

        d = await getRepository(Deposit).save(d);

        return res.status(200).send(d);

    }

}
