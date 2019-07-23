import { NestMiddleware, Injectable, UnauthorizedException } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { UserService } from "../user/user.service";

import * as jwt from "jsonwebtoken";
import { jwtConstants } from "./auth.constants";

@Injectable()
export class AuthMiddleware implements NestMiddleware {

	constructor(
		private readonly userService: UserService
	) {}

	async use(req: Request, res: Response, next: NextFunction) {
		const authHeaders = req.headers.authorization;

		if (authHeaders && (authHeaders as string).split(' ')[1]) {
			const token = (authHeaders as string).split(' ')[1];

			let decoded: any;

			try {
				decoded = jwt.verify(token, jwtConstants.secret);
			} catch(e) {
				throw new UnauthorizedException(e);
			}

			const user = await this.userService.findOneById(decoded.id);

			if (!user) {
				throw new UnauthorizedException('User not found');
			} else {
				if (user.verified === false) {
					throw new UnauthorizedException('User is not verified');
				}
			}

			(req as any).user = user;
			next();
		} else {
			throw new UnauthorizedException();
		}
	}

}