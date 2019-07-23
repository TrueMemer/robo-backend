import { VerificationTokenType } from "../verification-token.entity";
import { IsInt } from "class-validator";

export class CreateVerificationTokenDto {

	@IsInt()
	user_id: number;

	@IsInt()
	type: VerificationTokenType;

}