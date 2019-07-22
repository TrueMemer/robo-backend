import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { jwtConstants } from "./auth.constants";
import { ExtractJwt } from "passport-jwt";
import { Injectable } from "@nestjs/common";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
	
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
			ignoreExpiration: false,
			secretOrKey: jwtConstants.secret
		});
	}

	async validate(payload: any) {
    	return { id: payload.sub, username: payload.username };
  	}

}