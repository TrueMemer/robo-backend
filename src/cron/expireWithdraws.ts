import { getRepository } from "typeorm";
import Withdrawal, { WithdrawalStatus } from "../entity/Withdrawal";
import moment = require("moment");
import { Logger } from "@overnightjs/logger";

export default async () => {

	Logger.Imp("Check withdraws expire...");

	const withdraws = await getRepository(Withdrawal).find();

	for (let w of withdraws) {


		let expireDate = moment(w.created).utc().add(1, "hours");

		console.log(expireDate)
		console.log(moment().utc())

		if (w.status != WithdrawalStatus.PENDING) {
			continue;
		}

		if (moment().utc() > expireDate) {
			w.status = WithdrawalStatus.EXPIRING;

			w = await getRepository(Withdrawal).save(w);
		}

	}

}