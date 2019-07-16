import { Controller, ClassMiddleware, Get } from "@overnightjs/core";
import { JWTChecker } from "../middlewares/JWTChecker";

import { RoleChecker } from "../middlewares/RoleChecker";

import { Request, Response } from "express";

import { getRepository } from "typeorm";
import Deposit, { DepositStatus } from "../entity/Deposit";
import User from "../entity/User";
import Order from "../entity/Order";
import Profit from "../entity/Profit";
import Withdrawal from "../entity/Withdrawal";

@Controller("api/cp")
@ClassMiddleware([JWTChecker, RoleChecker(["ADMIN"])])
export class AdminController {

	@Get("stats")
	private async getStats(req: Request, res: Response) {

		const begin = req.query.begin;
		const end = req.query.end;

		console.log(begin)

		const { investedTotal } = await getRepository(Deposit)
									.createQueryBuilder("deposit")
									.select("sum(amount)", "investedTotal")
									.where(`"pendingEndTime" > :begin`, { begin: begin != null ? begin : new Date(0) })
									.andWhere(`"pendingEndTime" < :end`, { end: end != null ? end : new Date(Date.now()) })
									.andWhere("type = '0'")
									.getRawOne();

		const { reinvestedTotal } = await getRepository(Deposit)
							.createQueryBuilder("deposit")
							.select("sum(amount)", "reinvestedTotal")
							.where(`"pendingEndTime" > :begin`, { begin: begin != null ? begin : new Date(0) })
							.andWhere(`"pendingEndTime" < :end`, { end: end != null ? end : new Date(Date.now()) })
							.andWhere("type = '1'")
							.getRawOne();

		const { registered } = await getRepository(User)
								.createQueryBuilder("user")
								.select("count(*)", "registered")
								.where(`"createdAt" > :begin`, { begin: begin != null ? begin : new Date(0) })
								.andWhere(`"createdAt" < :end`, { end: end != null ? end : new Date(Date.now()) })
								.getRawOne();

		const { balance } = await getRepository(Order)
								.createQueryBuilder("order")
								.select("close_balance", "balance")
								.where(`"close_time" > :begin`, { begin: begin != null ? begin : new Date(0) })
								.andWhere(`"close_time" < :end`, { end: end != null ? end : new Date(Date.now()) })
								.orderBy({ close_time: "DESC" })
								.limit(1)
								.getRawOne();

		const { roboProfit } = await getRepository(Order)
									.createQueryBuilder("order")
									.select("sum(profit + swap + commission)", "roboProfit")
									.where(`"close_time" > :begin`, { begin: begin != null ? begin : new Date(0) })
									.andWhere(`"close_time" < :end`, { end: end != null ? end : new Date(Date.now()) })
									.andWhere("type != '6'")
									.getRawOne();

		let { userProfits } = await getRepository(Profit)
									.createQueryBuilder("profit")
									.select("sum(profit)", "userProfits")
									.where("type = '0'")
									.orWhere("type = '1'")
									.orWhere("type = '4'")
									.where(`date > :begin`, { begin: begin != null ? begin : new Date(0) })
									.andWhere(`date < :end`, { end: end != null ? end : new Date(Date.now()) })
									.getRawOne();

		const { withdraws } = await getRepository(Withdrawal)
									.createQueryBuilder("withdrawal")
									.select("sum(amount)", "withdraws")
									.where("status = '1'")
									.andWhere("type = '0'")
									.where(`created > :begin`, { begin: begin != null ? begin : new Date(0) })
									.andWhere(`created < :end`, { end: end != null ? end : new Date(Date.now()) })
									.getRawOne();

		userProfits -= withdraws;

		const safetyDepo = roboProfit != null ? (10 / 100) * roboProfit : 0;

		const ourProfit = balance - (investedTotal + reinvestedTotal + userProfits + safetyDepo);

		return res.status(200).send({
			investedTotal: investedTotal != null ? investedTotal : 0,
			reinvestedTotal,
			registered: registered != null ? registered : 0,
			balance,
			roboProfit,
			safetyDepo,
			userProfits,
			ourProfit
		});

	}

}