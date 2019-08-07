import { Controller, Middleware, Post, Get } from "@overnightjs/core";
import { validate } from "class-validator";
import { Request, Response } from "express";
import * as geoip from "geoip-country";
import { sign } from "jsonwebtoken";
import { getRepository } from "typeorm";
import config from "../config/config";
import AuthorizationEntry from "../entity/AuthorizationEntry";
import User from "../entity/User";
import { JWTChecker } from "../middlewares/JWTChecker";
import { VerificationToken, VerificationTokenType } from "../entity/VerificationToken";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";

@Controller("api/auth")
export class AuthController {

    @Post("login")
    private async login(req: Request, res: Response) {

        const { username, password } = req.body;
        if (!(username && password)) {
            return res.status(400).send({
                msg: "Bad request (no username or password)",
                code: 400
            });
        }

        const userRepository = getRepository(User);
        let user: User;
        try {
            user = await userRepository.findOneOrFail(
                { where: { username }, select: ["id", "username", "password", "isVerified"]
            });
        } catch (error) {
            return res.status(401).send({
                msg: "Unauthorized (invalid credentials)",
                code: 401
            });
        }

        if (!user.checkIfUnencryptedPasswordIsValid(password)) {
            return res.status(401).send({
                msg: "Unauthorized (invalid credentials)",
                code: 401
            });
        }

        if (!user.isVerified) {
            return res.status(401).send({
                msg: "Unauthorized (account is not verified)",
                code: 401
            });
        }

        const e = new AuthorizationEntry();
        e.user_id = user.id;
        let ip = req.ip;
        if (ip.substr(0, 7) === "::ffff:") {
            ip = ip.substr(7);
        }
        e.ip = ip;
        const country = geoip.lookup(e.ip);
        e.country = country != null ? country.country : "Неизвестно";

        await getRepository(AuthorizationEntry).save(e);

        const token = sign(
        { userId: user.id, username: user.username },
        config.jwtSecret,
        { expiresIn: "1h" }
        );

        res.send({ token });
  }

    @Post("change-password")
    @Middleware([JWTChecker])
    private async changePassword(req: Request, res: Response) {
        const id = res.locals.jwtPayload.userId;

        const { oldPassword, newPassword, token } = req.body;
        if (!(oldPassword && newPassword) || !(newPassword && token)) {
            return res.status(400).send({
                msg: "Bad request (no old password or new password)",
                code: 400
            });
        }

        const userRepository = getRepository(User);
        let user: User;
        try {
            user = await userRepository.findOneOrFail({ where: { id }, select: ["id", "password"] });
        } catch (id) {
            return res.status(401).send({
                msg: "Unauthorized (expired token)",
                code: 401
            });
        }

        if (token) {
            const t = await getRepository(VerificationToken).findOne({
                where: { token, userId: user.id }
            });

            if (!t || (t != null ? t.type : -1) !== VerificationTokenType.PASSRESET) {
                return res.status(400).send({
                    msg: "Bad token",
                    code: 400
                });
            }

            await getRepository(VerificationToken).remove(t);

        } else {
            if (!user.checkIfUnencryptedPasswordIsValid(oldPassword)) {
                return res.status(401).send({
                    msg: "Unauthorized (wrong old password)",
                    code: 401
                });
            }
        }

        user.password = newPassword;
        const errors = await validate(user, { skipMissingProperties: true });
        if (errors.length > 0) {
            return res.status(400).send({
                msg: "Validation error" ,
                code: 400,
                errors
            });
        }

        user.hashPassword();
        userRepository.save(user);

        res.status(200).send();
    }

    @Post("resetPasswordChange")
    private async resetPasswordChange(req: Request, res: Response) {

        const { newPassword, token } = req.body;
        if (!(newPassword && token)) {
            return res.status(400).send({
                msg: "Bad request (no old password or new password)",
                code: 400
            });
        }

        const t = await getRepository(VerificationToken).findOne({
            where: { token }
        });

        if (!t || (t != null ? t.type : -1) !== VerificationTokenType.PASSRESET) {
            return res.status(400).send({
                msg: "Bad token",
                code: 400
            });
        }

        const user = await getRepository(User).findOne({
            where: { id: t.userId }
        });

        await getRepository(VerificationToken).remove(t);

        user.password = newPassword;
        const errors = await validate(user);
        if (errors.length > 0) {
            return res.status(400).send({
                msg: "Validation error" ,
                code: 400,
                errors
            });
        }

        user.hashPassword();
        await getRepository(User).save(user);

        res.status(200).send();
    }

    @Post("resetPassword")
    private async reset(req: Request, res: Response) {

        const { username } = req.body;

        if (!username) {
            return res.status(400).send();
        }

        const user = await getRepository(User).findOne({
            where: { username }
        });

        if (!user) {
            return res.status(400).send({
                msg: "No user with that username exist",
                code: 400
            });
        }

        let t = new VerificationToken();
        t.type = VerificationTokenType.PASSRESET;
        t.token = crypto.randomBytes(16).toString("hex");
        t.userId = user.id;

        t = await getRepository(VerificationToken).save(t);

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
            subject: "Восстановление пароля",
            text: "Здравствуйте,\n\n" +
                "Пожалуйста перейдите по ссылке для восстановления пароля: \nhttp://robofxtrading.net/reset-password/"
                + user.email
                + "/"
                + t.token
                + " .\n" };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            return res.status(500).send({
                msg: "Failed to send confirmation email. Please contact administrator.",
                code: 500
            });
        }

        return res.status(200).send();

    }
}
