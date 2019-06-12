import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { getRepository } from "typeorm";
import { validate } from "class-validator";

import User from "../entity/User";
import config from "../config/config";

export default class AuthController {
    static login = async (req: Request, res: Response) => {

    let { username, password } = req.body;
    if (!(username && password)) {
        return res.status(400).send({
            msg: "Bad request (no username or password)",
            code: 400
        });
    }

    const userRepository = getRepository(User);
    let user: User;
    try {
        user = await userRepository.findOneOrFail({ where: { username }, select: ["id", "username", "password", "isVerified"] });
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

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: "1h" }
    );

    res.send({ token: token });
  };

  static changePassword = async (req: Request, res: Response) => {
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
            errors: errors
        });
    }

    user.hashPassword();
    userRepository.save(user);

    res.status(200).send();
  };
}