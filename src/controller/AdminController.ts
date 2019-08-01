import { Controller, ClassMiddleware, Get, Post, Patch, Delete } from "@overnightjs/core";
import { JWTChecker } from "../middlewares/JWTChecker";

import { RoleChecker } from "../middlewares/RoleChecker";

import { Request, Response } from "express";

import { getRepository, MoreThan, Like, Transaction } from "typeorm";
import Deposit, { DepositStatus } from "../entity/Deposit";
import User from "../entity/User";
import Order from "../entity/Order";
import Profit from "../entity/Profit";
import Withdrawal from "../entity/Withdrawal";
import { validate } from "class-validator";
import recalculateProfits from "../cron/recalculateProfits";
import moment = require("moment");


@Controller("api/cp")
@ClassMiddleware([JWTChecker, RoleChecker(["ADMIN"])])
export class AdminController {

	@Get("stats")
	private async getStats(req: Request, res: Response) {

		let { date } = await getRepository(Order)
							.createQueryBuilder("order")
							.select("open_time", "date")
							.orderBy({ open_time: "ASC" })
							.limit(1)
							.getRawOne();

		let first = moment(date).utc().startOf("month").hour(0).minute(0).second(0);
		let endDate = moment().utc().endOf("month").hour(0).minute(0).second(0);
		let result = {};
		let tmp = {};

		let prevMonth = null;

		while(first < endDate) {

			let end = moment(first);
			end.endOf("month");

			let investedTotal = (await getRepository(Deposit)
										.createQueryBuilder("deposit")
										.select("sum(amount)", "investedTotal")
										.where(`"pendingEndTime" > :first`, { first })
										.andWhere(`"pendingEndTime" < :end`, { end })
										.andWhere("type = '0'")
										.getRawOne() || {}).investedTotal || 0;

			let reinvestedTotal = (await getRepository(Deposit)
								.createQueryBuilder("deposit")
								.select("sum(amount)", "reinvestedTotal")
								.where(`"pendingEndTime" > :first`, { first })
								.andWhere(`"pendingEndTime" < :end`, { end })
								.andWhere("type = '1'")
								.getRawOne() || {}).reinvestedTotal || 0;

			let registered = (await getRepository(User)
									.createQueryBuilder("user")
									.select("count(*)", "registered")
									.where(`"createdAt" > :first`, { first })
									.andWhere(`"createdAt" < :end`, { end })
									.getRawOne() || {}).registered || 0;

			registered = parseInt(registered);

			let balance = (await getRepository(Order)
									.createQueryBuilder("order")
									.select("close_balance", "balance")
									.where(`"close_time" > :first`, { first })
									.andWhere(`"close_time" < :end`, { end })
									.orderBy({ close_time: "DESC" })
									.limit(1)
									.getRawOne() || {}).balance || 0;

			let roboProfit = (await getRepository(Order)
										.createQueryBuilder("order")
										.select("sum(profit + swap + commission)", "roboProfit")
										.where(`"close_time" > :first`, { first })
										.andWhere(`"close_time" < :end`, { end })
										.andWhere("type != '6'")
										.getRawOne() || {}).roboProfit || 0;

			let userProfits = (await getRepository(Profit)
										.createQueryBuilder("profit")
										.select("sum(profit)", "userProfits")
										.where("type = '0'")
										.orWhere("type = '1'")
										.orWhere("type = '4'")
										.where(`date > :first`, { first })
										.andWhere(`date < :end`, { end })
										.getRawOne() || {}).userProfits || 0;

			let withdraws = (await getRepository(Withdrawal)
										.createQueryBuilder("withdrawal")
										.select("sum(amount)", "withdraws")
										.where("status = '1'")
										.andWhere("type = '0'")
										.andWhere(`created > :first`, { first })
										.andWhere(`created < :end`, { end })
										.getRawOne() || {}).withdraws || 0;

			if (prevMonth) {
				investedTotal += result[prevMonth].invested.total || 0;
				reinvestedTotal += result[prevMonth].reinvested.total || 0;
				roboProfit += result[prevMonth].roboProfit.total || 0;
				userProfits += result[prevMonth].userProfits.total || 0;
				withdraws += result[prevMonth].withdraws.total || 0;
				registered += result[prevMonth].registered.total || 0;
			}

			let safetyDepo = (10 / 100) * roboProfit;

			let ourProfit = balance - (investedTotal + reinvestedTotal + userProfits + safetyDepo + withdraws);

			let obj: any = {
					invested: {
						total: investedTotal,
						diff: -(prevMonth ? result[prevMonth].invested.total - investedTotal : 0)
					},
					withdraws: {
						total: withdraws,
						diff: -(prevMonth ? result[prevMonth].withdraws.total - withdraws : 0)
					},
					reinvested: {
						total: reinvestedTotal,
						diff: -(prevMonth ? result[prevMonth].reinvested.total - reinvestedTotal : 0)
					},
					registered: {
						total: registered,
						diff: -(prevMonth ? result[prevMonth].registered.total - registered : 0)
					},
					balance: {
						total: balance,
						diff: -(prevMonth ? result[prevMonth].balance.total - balance : 0)
					},
					roboProfit: {
						total: roboProfit,
						diff: -(prevMonth ? result[prevMonth].roboProfit.total - roboProfit : 0)
					},
					safetyDepo: {
						total: safetyDepo,
						diff: -(prevMonth ? result[prevMonth].safetyDepo.total - safetyDepo : 0)
					},
					userProfits: {
						total: userProfits,
						diff: -(prevMonth ? result[prevMonth].userProfits.total - userProfits : 0)
					},
					ourProfit: {
						total: ourProfit,
						diff: -(prevMonth ? result[prevMonth].ourProfit.total - ourProfit : 0)
					}
			}

			prevMonth = `${first.month() + 1}/${first.year()}`;
			obj.date = prevMonth;
			result[prevMonth] = obj;

			first.add("month", 1);

		}

		console.log(result);

		for (let key in result) {
			result[key].invested.total = parseFloat(result[key].invested.total).toFixed(2);
			result[key].invested.diff = parseFloat(result[key].invested.diff).toFixed(2);
			result[key].withdraws.total = parseFloat(result[key].withdraws.total).toFixed(2);
			result[key].withdraws.diff = parseFloat(result[key].withdraws.diff).toFixed(2);
			result[key].reinvested.total = parseFloat(result[key].reinvested.total).toFixed(2);
			result[key].reinvested.diff = parseFloat(result[key].reinvested.diff).toFixed(2);
			result[key].balance.total = parseFloat(result[key].balance.total).toFixed(2);
			result[key].roboProfit.total = parseFloat(result[key].roboProfit.total).toFixed(2);
			result[key].safetyDepo.total = parseFloat(result[key].safetyDepo.total).toFixed(2);
			result[key].userProfits.total = parseFloat(result[key].userProfits.total).toFixed(2);
			result[key].ourProfit.total = parseFloat(result[key].ourProfit.total).toFixed(2);
			result[key].balance.diff = parseFloat(result[key].balance.diff).toFixed(2);
			result[key].roboProfit.diff = parseFloat(result[key].roboProfit.diff).toFixed(2);
			result[key].safetyDepo.diff = parseFloat(result[key].safetyDepo.diff).toFixed(2);
			result[key].userProfits.diff = parseFloat(result[key].userProfits.diff).toFixed(2);
			result[key].ourProfit.diff = parseFloat(result[key].ourProfit.diff).toFixed(2);
		}

		console.log(result);

		return res.status(200).send(Object.values(result));

	}

	@Get("deposits")
	private async getDeposits(req: Request, res: Response) {

		const begin = req.query.begin != null ? req.query.begin : new Date(0);
		const end = req.query.end != null ? req.query.end : new Date(99999999999999);

		const deposits = await getRepository(Deposit)
							.createQueryBuilder("deposit")
							.select()
							.where("\"pendingEndTime\" > :begin", { begin })
							.andWhere("\"pendingEndTime\" < :end", { end })
							.orderBy({ "created": "ASC" })
							.getMany();

		return res.send(deposits);

	}

	@Post("deposits")
	private async createDeposit(req: Request, res: Response) {

		let deposit: Deposit = req.body;

		try {
			deposit = await getRepository(Deposit).save(deposit);
		} catch (e) {
			return res.status(400).send({
				msg: e.message,
				code: 400
			})
		}

		return res.send(deposit);

	}

	@Patch("deposits/:ids")
	private async patchDeposit(req: Request, res: Response) {

		if (!req.params.ids) {
			return res.status(400).send({
				msg: "No deposit ids",
				code: 400
			});
		}

		const diff = req.body != null ? req.body : {};

		const ids = req.params.ids.split(",");

		if (ids.length < 1) {
			return res.status(400).send({
				msg: "No deposit ids",
				code: 400
			});
		}

		const editedDeposits = [];

		for (const id of ids) {

			let deposit = await getRepository(Deposit).findOne(id);

			if (!deposit) continue;

			for (const key in diff) {
				if (deposit.hasOwnProperty(key)) {
					deposit[key] = diff[key];
				}
			}

			deposit = await getRepository(Deposit).save(deposit);

			editedDeposits.push(deposit);

		}

		res.send(editedDeposits);

	}

	@Delete("deposits/:ids")
	private async deleteDeposit(req: Request, res: Response) {

		if (!req.params.ids) {
			return res.status(400).send({
				msg: "No deposit ids",
				code: 400
			});
		}

		const ids = req.params.ids.split(",");

		if (ids.length < 1) {
			return res.status(400).send({
				msg: "No deposit ids",
				code: 400
			});
		}

		const removedDeposits = [];

		for (const id of ids) {

			const deposit = await getRepository(Deposit).findOne(id);

			if (!deposit) continue;

			await getRepository(Deposit).remove(deposit);

			removedDeposits.push(deposit);

		}

		res.send(removedDeposits);

	}

	@Get("withdraws")
	private async getWithdraws(req: Request, res: Response) {

		const begin = req.query.begin != null ? req.query.begin : new Date(0);
		const end = req.query.end != null ? req.query.end : new Date(99999999999999);

		const withdraws = await getRepository(Withdrawal)
							.createQueryBuilder("withdrawal")
							.select()
							.where("created > :begin", { begin })
							.andWhere("created < :end", { end })
							.orderBy({ "created": "ASC" })
							.getMany();

		return res.send(withdraws);

	}

	@Post("withdraws")
	private async createWithdraws(req: Request, res: Response) {

		let withdraw = req.body;

		try {
			withdraw = await getRepository(Withdrawal).save(withdraw);
		} catch (e) {
			return res.status(400).send({
				msg: e.message,
				code: 400
			})
		}

		return res.send(withdraw);

	}

	@Patch("withdraws/:ids")
	private async pathWithdraws(req: Request, res: Response) {

		if (!req.params.ids) {
			return res.status(400).send({
				msg: "No withdraw ids",
				code: 400
			});
		}

		const diff = req.body != null ? req.body : {};

		const ids = req.params.ids.split(",");

		if (ids.length < 1) {
			return res.status(400).send({
				msg: "No withdraw ids",
				code: 400
			});
		}

		const editedWithdraws = [];

		for (const id of ids) {

			let w = await getRepository(Withdrawal).findOne(id);

			if (!w) continue;

			for (const key in diff) {
				if (w.hasOwnProperty(key)) {
					w[key] = diff[key];
				}
			}

			w = await getRepository(Withdrawal).save(w);

			editedWithdraws.push(w);

		}

		res.send(editedWithdraws);

	}

	@Delete("withdraws/:ids")
	private async deleteWithdraws(req: Request, res: Response) {

		if (!req.params.ids) {
			return res.status(400).send({
				msg: "No withdraw ids",
				code: 400
			});
		}

		const ids = req.params.ids.split(",");

		if (ids.length < 1) {
			return res.status(400).send({
				msg: "No withdraw ids",
				code: 400
			});
		}

		const removedWithdraws = [];

		for (const id of ids) {

			const w = await getRepository(Withdrawal).findOne(id);

			if (!w) continue;

			await getRepository(Withdrawal).remove(w);

			removedWithdraws.push(w);

		}

		res.send(removedWithdraws);

	}

	@Get("searchUsers")
	private async searchUsers(req: Request, res: Response) {

		const u = req.query.usernames != null ? req.query.usernames : "";

		const usernames = u.split(",");

		const users = [];

		for (const query of usernames) {

			const user = await getRepository(User)
								.createQueryBuilder("user")
								.where(`upper(username) like upper('${query}%')`)
								.getMany();

			if (user.length > 0) {
				for (const u of user) {
					users.push({ id: u.id, username: u.username });
				}
			}

		}

		return res.send(users);

	}

	@Get("profits")
	private async getProfits(req: Request, res: Response) {

		const begin = req.query.begin != null ? req.query.begin : new Date(0);
		const end = req.query.end != null ? req.query.end : new Date(99999999999999);

		const profits = await getRepository(Profit)
							.createQueryBuilder("profit")
							.select()
							.where("date > :begin", { begin })
							.andWhere("date < :end", { end })
							.where("type = '0'")
							.orWhere("type = '1'")
							.orderBy({ "date": "ASC" })
							.getMany();

		return res.send(profits);

	}

	@Get("recalculateProfits")
	private async recalculateProfit(req: Request, res: Response) {

		const _tickets = req.query.orders != null ? req.query.orders : "";
		const tickets = _tickets.split(",");

		const _userIds = req.query.users != null ? req.query.users : "";
		const userIds = _userIds.split(",");

		const method = req.query.method != null ? req.query.method : 'v1';

		for (const t of tickets) {

			if (t === "") continue;

			if (userIds.length < 1) {

				// Пересчет сделки для всех
				await getRepository(Profit).delete({
					ticket: t
				});

			} else {

				for (const u of userIds) {

					if (u === "") continue;

					// Удаляем профиты юзера
					await getRepository(Profit).delete({
						ticket: t,
						user_id: u
					});

					// Удаляем профиты у его реферов
					await getRepository(Profit).delete({
						ticket: t,
						referral_id: u
					});


				}

			}

		}

		recalculateProfits();

		return res.status(200).send();

	}

	@Get("transaction")
	private async getTransaction(req: Request, res: Response) {

		const begin = req.query.begin != null ? req.query.begin : new Date(0);
		const end = req.query.end != null ? req.query.end : new Date(99999999999999);

		const transaction = await getRepository(Transaction)
							.createQueryBuilder("transaction")
							.select()
							.where("created > :begin", { begin })
							.andWhere("created < :end", { end })
							.orderBy({ "created": "ASC" })
							.getMany();

		//return res.send(withdraws);

	}

}