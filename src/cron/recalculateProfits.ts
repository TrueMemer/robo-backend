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

    await getConnection()
        .createQueryBuilder()
        .delete()
        .from(Profit)
        .execute();

    for (const user of users) {

        Logger.Imp(`User start [${user.id}] ${user.username}:`);

        const deposits = await getRepository(Deposit).find(
            { where: { user_id: user.id, status: DepositStatus.WORKING }, order: { pendingEndTime: "ASC" }
        });

        let workingDep = 0.0;

        for (let i = 0; i < deposits.length; i++) {

            Logger.Imp(`Deposit start ${deposits[i].id}: ${deposits[i].pendingEndTime}`);

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

            for (const order of orders) {

                Logger.Imp(`Order start [${order.id}, ${order.ticket}]`);

                const tmp = await getRepository(Profit).find({
                    where: { ticket: order.ticket, user_id: user.id }
                });

                if (tmp) {
                    Logger.Warn(`Ignoring already calculated profit for order ${order.ticket}`);
                    continue;
                }

                if (order.type as number === 6) {
                    Logger.Warn(`Order ${order.ticket} is type 6, ignoring...`);
                    continue;
                }

                if (order.open_time < deposits[0].pendingEndTime) {
                    Logger.Warn(`Orders open time is lesser than first deposit time. Ignoring...`);
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

                profit.user_id = user.id;
                profit.ticket = order.ticket;
                profit.depositFactor = workingDepo / order.open_balance;
                Logger.Imp(`[${order.ticket}]: DepositFactor: ${profit.depositFactor}`);
                profit.workingDeposit = workingDepo;
                Logger.Imp(`[${order.ticket}]: WorkingDep: ${profit.workingDeposit}`);
                profit.profit = ((order.profit + order.swap) * profit.depositFactor) / 2;
                profit.ticket = order.ticket;
                Logger.Imp(`[${order.ticket}]: Profit: ${profit.profit}`);

                profit = await getRepository(Profit).save(profit);

                if (user.referral) {
                    const referrer = await getRepository(User).findOne({ where: { username: user.referral } });

                    if (referrer) {
                        Logger.Imp(`Referral 1 level started [${user.referral}, ${referrer.id}]`);

                        let p1 = new Profit();

                        p1.type = ProfitType.REFERRALS;
                        p1.referral_id = user.id;
                        p1.ticket = order.ticket;
                        p1.profit = (ReferralProfits[referrer.referral_level][0] / 100) * profit.profit;
                        Logger.Imp(`Referral 1 level profit: ${p1.profit}`);
                        p1.user_id = referrer.id;

                        p1 = await getRepository(Profit).save(p1);

                        if (referrer.referral) {

                            const referrer2 = await getRepository(User).findOne(
                                { where: { username: referrer.referral } });

                            if (referrer2) {

                                Logger.Imp(`Referral 2 level started [${referrer.referral}, ${referrer2.id}]`);

                                let p2 = new Profit();

                                p2.type = ProfitType.REFERRALS;
                                p2.referral_id = user.id;
                                p2.ticket = order.ticket;
                                p2.profit = (ReferralProfits[referrer2.referral_level][1] / 100) * profit.profit;
                                Logger.Imp(`Referral 2 level profit: ${p2.profit}`);
                                p2.user_id = referrer2.id;

                                p2 = await getRepository(Profit).save(p2);
                            }

                            if (referrer2.referral) {
                                const referrer3 = await getRepository(User).findOne({
                                    where: { username: referrer2.referral }
                                });

                                if (referrer3 && referrer3.referral_level > 0) {
                                    Logger.Imp(`Referral 3 level started [${referrer2.referral}, ${referrer3.id}]`);

                                    let p3 = new Profit();

                                    p3.type = ProfitType.REFERRALS;
                                    p3.referral_id = user.id;
                                    p3.ticket = order.ticket;
                                    p3.profit = (ReferralProfits[referrer3.referral_level][1] / 100) * profit.profit;
                                    Logger.Imp(`Referral 3 level profit: ${p3.profit}`);
                                    p3.user_id = referrer2.id;

                                    p3 = await getRepository(Profit).save(p3);
                                }
                            }
                        }
                    }
                }

                Logger.Imp(`End order [${order.id}, ${order.ticket}]`);
            }

            Logger.Imp(`End deposit ${deposits[i].id}: ${deposits[i].pendingEndTime}`);
        }

        user.updateBalance();
        user.updateDeposits();

        await getRepository(User).save(user);

        Logger.Imp(`User end [${user.id}] ${user.username}:`);

    }

};
