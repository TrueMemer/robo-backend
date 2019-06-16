import { NextFunction, Request, Response } from "express-serve-static-core";
import * as jwt from "jsonwebtoken";
import config from "../config/config";

export const JWTChecker = (req: Request, res: Response, next: NextFunction) => {
    const token = req.get("Authorization") as string;

    let jwtPayload;

    try {
        jwtPayload = jwt.verify(token, config.jwtSecret) as any;
        res.locals.jwtPayload = jwtPayload;
    } catch (error) {
        res.status(401).send();
        return;
    }

    const { userId, username } = jwtPayload;
    const newToken = jwt.sign({ userId, username }, config.jwtSecret, {
        expiresIn: "1h"
    });
    res.setHeader("Authorization", newToken);
    res.setHeader("Access-Control-Expose-Headers", "Authorization");

    next();
};
