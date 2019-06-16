import { getConnection, getRepository } from "typeorm";
import Deposit, { DepositStatus } from "../entity/Deposit";
import Order from "../entity/Order";
import Profit from "../entity/Profit";
import User from "../entity/User";

export default async () => {

    const users: User[] = await getRepository(User).find();

    for (const user of users) {

        await getConnection()
            .createQueryBuilder()
            .delete()
            .from(Profit)
            .where("user_id = :id", { id: user.id })
            .execute();

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
                            .where("order.type != 6")
                            .andWhere("order.close_balance != 0");

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

                const profit = new Profit();

                if (order.type as number === 6) {
                    console.log(order);
                    continue;
                }

                profit.user_id = user.id;
                profit.ticket = order.ticket;
                profit.depositFactor = workingDep / order.open_balance;
                profit.workingDeposit = workingDep;
                profit.profit = ((order.profit + order.swap) * profit.depositFactor) / 2;

                await getRepository(Profit).save(profit);
            }
        }

        user.updateBalance();
        user.updateDeposits();

        await getRepository(User).save(user);

    }

};
