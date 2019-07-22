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

			if (userIds.length < 1) {

				// Пересчет сделки для всех
				await getRepository(Profit).delete({
					ticket: t
				});

			} else {

				for (const u of userIds) {

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