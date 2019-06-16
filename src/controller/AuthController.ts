import { Controller, Middleware, Post } from "@overnightjs/core";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { sign } from "jsonwebtoken";
import { getRepository } from "typeorm";
import config from "../config/config";
import User from "../entity/User";
import { JWTChecker } from "../middlewares/JWTChecker";

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

    const { oldPassword, newPassword } = req.body;
    if (!(oldPassword && newPassword)) {
        return res.status(400).send({
            msg: "Bad request (no old password or new password)",
            code: 400
        });
    }

    const userRepository = getRepository(User);
    let user: User;
    try {
        user = await userRepository.findOneOrFail(id, { select: ["id", "username", "password"] });
    } catch (id) {
        return res.status(401).send({
            msg: "Unauthorized (expired token)",
            code: 401
        });
    }

    if (!user.checkIfUnencryptedPasswordIsValid(oldPassword)) {
        return res.status(401).send({
            msg: "Unauthorized (wrong old password)",
            code: 401
        });
    }

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
    userRepository.save(user);

    res.status(200).send();
  }
}
