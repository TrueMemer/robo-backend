import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";

import User, { UserRole } from "../entity/User";
import { VerificationToken } from "../entity/VerificationToken";

import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import config from "../config/config";

export default class UserController {

    static listAll = async (req: Request, res: Response) => {
        //Get users from database
        const userRepository = getRepository(User);
        const users = await userRepository.find({
            select: ["id", "username", "role", "email"] //We dont want to send the passwords on response
        });

        //Send the users object
        res.send(users);
    };

    static getOneById = async (req: Request, res: Response) => {
        //Get the ID from the url
        const id: number = req.params.id;

        //Get the user from database
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
    };

    static newUser = async (req: Request, res: Response) => {

        let { username, password, email, referrer } = req.body;
        let user = new User();
        user.username = username;
        user.password = password;
        user.email = email;
        user.role = UserRole.USER;
        user.isVerified = false;

        const errors = await validate(user);
        if (errors.length > 0) {
            return res.status(400).send({
                msg: "Validation error",
                code: 400,
                errors: errors
            });
        }

        user.hashPassword();

        const userRepository = getRepository(User);
        try {
            user = await userRepository.save(user);
        } catch (e) {
            return res.status(409).send({
                msg: "Conflict (username or email is already used)",
                code: 409
            });
        }

        let r = await getRepository(User).findOne({ where: { id: parseInt(referrer) } });

        if (r) {
            r.children.push(user);
        }

        const tokenRepository = getRepository(VerificationToken);

        let token = new VerificationToken();
        token.userId = user.id;
        token.token = crypto.randomBytes(16).toString("hex");

        try {
            token = await tokenRepository.save(token);
        }
        catch (error) {
            return res.status(500).send({
                msg: "Failed",
                code: 500
            });
        }

        let transporter = nodemailer.createTransport({
            service: config.mail.service,
            auth: {
                user: config.mail.username,
                pass: config.mail.password
            }
        });
        var mailOptions = { from: 'robofxtrading19@gmail.com', to: user.email, subject: 'Подтверждение почты', text: 'Здравствуйте,\n\n' + 'Пожалуйста перейдите по ссылке для подтверждения аккаунта: \nhttps://robofxtrading.net/confirmation/' + user.email + '/' + token.token + ' .\n' };

        try {
            await transporter.sendMail(mailOptions);
        }
        catch (error) {
            return res.status(500).send({
                msg: "Failed to send confirmation email. Please contact administrator.",
                code: 500
            });
        }

        res.status(201).send();
    };

    static confirmEmail = async (req: Request, res: Response) => {
        const token = req.query.token;

        let t: VerificationToken;

        try {
            t = <VerificationToken>await getRepository(VerificationToken).findOneOrFail({ token: token })
        }
        catch (error) {
            return res.status(404).send({
                msg: "Not found",
                code: 404
            });
        }

        let user: User;

        try {
            user = await getRepository(User).findOneOrFail(t.userId);
        }
        catch (error) {
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
        }
        catch (error) {
            res.status(500).send("Failed to verify user. Please contact administrator.");
            return;
        }

        res.status(200).send("Successfully verified!");

    };

    static editUser = async (req: Request, res: Response) => {
        //Get the ID from the url
        const id = req.params.id;

        //Get values from the body
        const { username, role, email } = req.body;

        //Try to find user on database
        const userRepository = getRepository(User);
        let user;
        try {
            user = await userRepository.findOneOrFail(id);
        } catch (error) {
            //If not found, send a 404 response
            res.status(404).send("User not found");
            return;
        }

        //Validate the new values on model
        user.username = username;
        user.role = role;
        user.email = email;
        const errors = await validate(user);
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
        //After all send a 204 (no content, but accepted) response
        res.status(204).send();
    };

    static deleteUser = async (req: Request, res: Response) => {
        //Get the ID from the url
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

        //After all send a 204 (no content, but accepted) response
        res.status(204).send();
    };
};