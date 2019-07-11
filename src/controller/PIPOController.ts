import { Controller, ClassMiddleware, Post, Middleware } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";
import { JWTChecker } from "../middlewares/JWTChecker";
import * as uuid from "uuid/v4";
import { getRepository } from "typeorm";
import User from "../entity/User";
import moment = require("moment");
import md5 = require("md5");
import axios from "axios";

@Controller("api/payment/pipo")
export class PayinPayout {

    @Post("create")
    @Middleware([JWTChecker])
    private async create(req: Request, res: Response) {

        const { amount } = req.body;

        const id = res.locals.jwtPayload.userId;

        const user = await getRepository(User).findOne(id);

        const uid = uuid();
        const agentTime = moment().utc().format("HH:mm:SS DD.MM.YYYY");

        let r;
        try {
            r = await axios.get(`https://api.cryptonator.com/api/ticker/usd-rur`);
        } catch (error) {
            return res.status(400).send({
                msg: "Can't convert currency (cryptonator is down?)",
                code: 400,
            });
        }

        const formAmount = ((amount * await r.data.ticker.price) + (amount * await r.data.ticker.price) * 0.055).toFixed(2);
        console.log(formAmount);

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

    @Post("status")
    private async status(req: Request, res: Response) {

        console.log(req.body);

    }



}