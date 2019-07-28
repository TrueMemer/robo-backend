import { Logger } from "@overnightjs/logger";
import { getConnection, getRepository } from "typeorm";
import Deposit, { DepositStatus } from "../entity/Deposit";
import Order from "../entity/Order";
import Profit, { ProfitType } from "../entity/Profit";
import User from "../entity/User";

export const ReferralProfits = [
    [0.25, 0.25],
    [0.25, 0.25, 0.25],
    [0.5, 0.25, 0.25],
    [0.5, 0.5, 0.25],
    [0.75, 0.5, 0.25],
    [1, 0.5, 0.25],
    [1, 0.75, 0.25]
];

export default async () => {

    const users: User[] = await getRepository(User).find();
    Logger.Imp("Recalculate profits begin");

    for (const user of users) {

        const deposits = await getRepository(Deposit).find(
            { where: { user_id: user.id, status: DepositStatus.WORKING }, order: { pendingEndTime: "ASC" }
        });

        let workingDep = 0.0;

        for (let i = 0; i < deposits.length; i++) {

            workingDep += deposits[i].amount;

            let orders = [];

            const query = await getRepository(Order)
                            .createQueryBuilder("order")
                            .addOrderBy("order.ticket", "ASC")
                            .where("order.type != '6'")
                            .andWhere("order.close_balance != 0")
                            .andWhere("order.close_time != '1970-01-01 00:00:00+00'::date");

            if (i === 0) {
                query.where("order.close_time > :date", { date: deposits[i].pendingEndTime });

                if (deposits[i + 1] !== undefined) {
                    query.andWhere("order.close_time < :date1", { date1: deposits[i + 1].pendingEndTime });
                }

                orders = await query.getMany();
            } else if (i === deposits.length - 1) {
                orders = await query
                    .where("order.close_time > :date", { date: deposits[i].pendingEndTime })
                    .andWhere("order.close_time > :date1", { date1: deposits[i - 1].pendingEndTime })
                    .getMany();
            } else {
                orders = await query
                    .where("order.close_time > :date", { date: deposits[i].pendingEndTime })
                    .andWhere("order.close_time < :date1", { date1: deposits[i + 1].pendingEndTime })
                    .getMany();
            }

            for (let order of orders) {

                const tmp = await getRepository(Profit).findOne({
                    where: { ticket: order.ticket, user_id: user.id, type: ProfitType.ORDERS }
                });

                if (tmp) {
                    continue;
                }

                if (order.type as number === 6) {
                    continue;
                }

                if (order.open_time < deposits[0].pendingEndTime) {
                    continue;
                }

                const { workingDepo } = await getRepository(Deposit)
                                        .createQueryBuilder("deposit")
                                        .select("sum(amount)", "workingDepo")
                                        .where("deposit.user_id = :uid", { uid: user.id })
                                        .andWhere("deposit.status = '1'")
                                        .andWhere("deposit.pendingEndTime < :date", { date: order.open_time })
                                        .getRawOne();

                let profit = new Profit();

        		if (user.id == 2 || user.id == 21 || user.id == 1) {
        			const { balance } = await getRepository(Order)
        						.createQueryBuilder("order")
        						.select("sum(profit + swap + commission)", "balance")
        						.where("close_time < :date", { date: order.open_time } )
        						.getRawOne();

        			order.open_balance = balance;
        		}

                profit.user_id = user.id;
                profit.ticket = order.ticket;
                profit.depositFactor = workingDepo / order.open_balance;
                profit.workingDeposit = workingDepo;
                profit.profit = ((order.profit + order.swap) * profit.depositFactor) / 2;
                profit.ticket = order.ticket;
		        profit.date = order.close_time;

                profit = await getRepository(Profit).save(profit);

                if (user.referral) {
                    const referrer = await getRepository(User).findOne({ where: { username: user.referral } });

                    if (referrer) {

                        let p1 = new Profit();

                        p1.type = ProfitType.REFERRALS;
                        p1.referral_id = user.id;
                        p1.ticket = order.ticket;
                        p1.profit = (ReferralProfits[referrer.referral_level][0] / 100) * profit.profit;
                        p1.user_id = referrer.id;
                        p1.referral_level = 1;
			            p1.date = order.close_time;

                        p1 = await getRepository(Profit).save(p1);

                        if (referrer.referral) {

                            const referrer2 = await getRepository(User).findOne(
                                { where: { username: referrer.referral } });

                            if (referrer2) {

                                let p2 = new Profit();

                                p2.type = ProfitType.REFERRALS;
                                p2.referral_id = user.id;
                                p2.ticket = order.ticket;
                                p2.profit = (ReferralProfits[referrer2.referral_level][1] / 100) * profit.profit;
                                p2.user_id = referrer2.id;
                                p2.referral_level = 2;
				                p2.date = order.close_time;

                                p2 = await getRepository(Profit).save(p2);
                            }

                            if (referrer2.referral) {
                                const referrer3 = await getRepository(User).findOne({
                                    where: { username: referrer2.referral }
                                });

                                if (referrer3 && referrer3.referral_level > 0) {

                                    let p3 = new Profit();

                                    p3.type = ProfitType.REFERRALS;
                                    p3.referral_id = user.id;
                                    p3.ticket = order.ticket;
                                    p3.profit = (ReferralProfits[referrer3.referral_level][1] / 100) * profit.profit;
                                    p3.user_id = referrer2.id;
                                    p3.referral_level = 3;
				                    p3.date = order.close_time;

                                    p3 = await getRepository(Profit).save(p3);
                                }
                            }
                        }
                    }
                }

            }

        }

        user.updateBalance();
        user.updateDeposits();

        await getRepository(User).save(user);


    }

};
