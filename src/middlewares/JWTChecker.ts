import { NextFunction, Response, Request } from "express-serve-static-core";
import * as jwt from "jsonwebtoken";
import config from "../config/config";

export const JWTChecker = (req: Request, res: Response, next: NextFunction) => {
    const token = <string>req.get("Authorization");

    let jwtPayload;

    try {
        jwtPayload = <any>jwt.verify(token, config.jwtSecret);
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

    next();
}