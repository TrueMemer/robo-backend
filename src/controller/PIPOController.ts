import { Controller, ClassMiddleware, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { JWTChecker } from "../middlewares/JWTChecker";
import * as uuid from "uuid/v4";
import { getRepository } from "typeorm";
import User from "../entity/User";
import moment = require("moment");
import md5 = require("md5");

@Controller("api/payment/pipo")
@ClassMiddleware([JWTChecker])
export class PayinPayout {

    @Post("create")
    private async create(req: Request, res: Response) {

        const { amount } = req.body;

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        const uid = uuid();
        const agentTime = moment().utc().format("HH:mm:SS DD.MM.YYYY");
        const formAmount = parseFloat(amount).toFixed(2);

        let sign_raw = `4283#${uid}#${agentTime}#${formAmount}#79090000001#${md5("W53prbl4uC")}`;

        console.log(sign_raw);

        let address = "https://lk.payin-payout.net/api/shop" +
            "?agentId=" + "4283" +
            "&orderId=" + uid +
            "&agentName=ROBO FX TRADING" +
            "&amount=" + formAmount +
            "&goods=ROBO FX TRADING INVEST" +
            "&currency=USD" +
            "&email=" + user.email +
            "&phone=79090000001" +
            //"&preference=125" +
            "&agentTime=" + agentTime +
            "&sign=" + md5(sign_raw);

        console.log(address);

        return res.status(200).send({
            url: address
        });

    }

}