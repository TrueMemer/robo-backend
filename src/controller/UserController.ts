import { Controller, Delete, Get, Middleware, Patch, Post } from "@overnightjs/core";
import { validate } from "class-validator";
import * as crypto from "crypto";
import { Request, Response } from "express";
import * as nodemailer from "nodemailer";
import { getRepository } from "typeorm";
import config from "../config/config";
import { Referral } from "../entity/Referral";
import User, { UserRole } from "../entity/User";
import { VerificationToken, VerificationTokenType } from "../entity/VerificationToken";
import { JWTChecker } from "../middlewares/JWTChecker";
import { RoleChecker } from "../middlewares/RoleChecker";
import Axios from "axios";


@Controller("api/user")
export default class UserController {

    @Get("")
    @Middleware([JWTChecker, RoleChecker(["ADMIN"])])
    private async listAll(req: Request, res: Response) {
        const userRepository = getRepository(User);
        const users = await userRepository.find();

        return res.send(await Promise.all(users.map(async (x) => {
            x.freeDeposit = await x.getFreeDeposit();
            x.workingDeposit = await x.getWorkingDepo();

            console.log(x.freeDeposit)

            return x;
        })));
    }

    @Get(":id([0-9]+)")
    @Middleware([JWTChecker, RoleChecker(["ADMIN"])])
    private async getOneById(req: Request, res: Response) {
        const id: number = req.params.id;

        const userRepository = getRepository(User);
        let user;
        try {
            user = await userRepository.findOneOrFail(id, {
                select: ["id", "username", "role", "email"]
            });
        } catch (error) {
            res.status(404).send("User not found");
            return;
        }

        res.send(user);
    }

    @Post("")
    private async newUser(req: Request, res: Response) {

        const { username, password, email, referrer, recaptcha_token } = req.body;

        if (0) {
            if (!recaptcha_token) {
                return res.status(400).send({
                    msg: "Invalid captcha",
                    code: 400
                });
            }
            ;

            const captcha_params = {
                secret: config.recaptcha_key,
                response: recaptcha_token,
                remote_ip: req.ip
            };

            console.log(captcha_params);

            const captcha_res = await (await Axios({
                url: "https://www.google.com/recaptcha/api/siteverify",
                params: captcha_params,
                method: "POST"
            })).data;

            if (captcha_res.success === false) {
                console.log(captcha_res)
                return res.status(400).send({
                    msg: "Invalid captcha",
                    code: 400
                })
            }
        }

        let user = new User();
        user.username = username;
        user.password = password;
        user.email = email;
        user.role = UserRole.USER;
        user.isVerified = false;

        const errors = await validate(user);
        if (errors.length > 0) {
            console.log(errors)
            return res.status(400).send({
                msg: "Validation error",
                code: 400,
                errors
            });
        }

        user.hashPassword();

        const userRepository = getRepository(User);
        try {
            user = await userRepository.save(user);
        } catch (e) {
            console.log(e);
            return res.status(409).send({
                msg: "Conflict (username or email is already used)",
                code: 409
            });
        }

        if (referrer) {
            const r = new Referral();

            r.referrer = parseInt(referrer, 10);
            r.referral = user.id;

            const referrerUser = await getRepository(User).findOne(r.referrer);

            user.referral = referrerUser.username;

            await getRepository(Referral).save(r);
            user = await getRepository(User).save(user);
        }

        const tokenRepository = getRepository(VerificationToken);

        let token = new VerificationToken();
        token.userId = user.id;
        token.token = crypto.randomBytes(16).toString("hex");

        try {
            token = await tokenRepository.save(token);
        } catch (error) {
            return res.status(500).send({
                msg: "Failed",
                code: 500
            });
        }

        const transporter = nodemailer.createTransport({
            host: "smtp.yandex.ru",
            port: 465,
            auth: {
                user: config.mail.username,
                pass: config.mail.password
            }
        });
        const mailOptions = {
            from: config.mail.username,
            to: user.email,
            subject: "Подтверждение почты",
            text: "Здравствуйте,\n\n" +
                "Пожалуйста перейдите по ссылке для подтверждения аккаунта: \nhttp://robofxtrading.net/confirmation/"
                + user.email
                + "/"
                + token.token
                + " .\n" };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            return res.status(500).send({
                msg: "Failed to send confirmation email. Please contact administrator.",
                code: 500
            });
        }

        res.status(201).send();
    }

    @Get("confirmation")
    private async confirmEmail(req: Request, res: Response) {
        const token = req.query.token;

        let t: VerificationToken;

        try {
            t = await getRepository(VerificationToken).findOneOrFail(
                { token, type: VerificationTokenType.EMAIL }) as VerificationToken;
        } catch (error) {
            return res.status(404).send({
                msg: "Not found",
                code: 404
            });
        }

        let user: User;

        try {
            user = await getRepository(User).findOneOrFail(t.userId);
        } catch (error) {
            res.status(400).send();
            return;
        }

        if (user.isVerified) {
            res.status(400).send("User is already verified!");
            return;
        }

        user.isVerified = true;
        try {
            await getRepository(User).save(user);
        } catch (error) {
            res.status(500).send("Failed to verify user. Please contact administrator.");
            return;
        }

        res.status(200).send("Successfully verified!");

    }

    @Patch(":id([0-9]+)")
    @Middleware([JWTChecker, RoleChecker(["ADMIN"])])
    private async editUser(req: Request, res: Response) {
        const id = req.params.id;

        const userRepository = getRepository(User);
        let user;
        try {
            user = await userRepository.findOneOrFail(id);
        } catch (error) {
            res.status(404).send("User not found");
            return;
        }

        for (const key in req.body) {
            if (user.hasOwnProperty(key)) {
                user[key] = req.body[key];
            }
        }

        const errors = await validate(user, { skipMissingProperties: true });
        if (errors.length > 0) {
            res.status(400).send(errors);
            return;
        }

        try {
            await userRepository.save(user);
        } catch (e) {
            res.status(409).send("username or email already in use");
            return;
        }

        res.status(204).send();
    }

    @Delete(":id([0-9]+)")
    @Middleware([JWTChecker, RoleChecker(["ADMIN"])])
    private async deleteUser(req: Request, res: Response) {
        const id = req.params.id;

        const userRepository = getRepository(User);
        let user: User;
        try {
            user = await userRepository.findOneOrFail(id);
        } catch (error) {
            res.status(404).send("User not found");
            return;
        }
        userRepository.delete(id);

        res.status(204).send();
    }
}
