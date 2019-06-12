import { getRepository, LessThan, Not, getConnection } from "typeorm";
import { User } from "../entity/User";
import Order from "../entity/Order";
import Deposit from "../entity/Deposit";
import Profit from "../entity/Profit";

export default async () => {
    
    const users : User[] = await getRepository(User).find();
    // const orders : Order[] = await getRepository(Order).find();

    for (let user of users) {

        await getConnection()
            .createQueryBuilder()
            .delete()
            .from(Profit)
            .where("user_id = :id", { id: user.id })
            .execute();


        const deposits = await getRepository(Deposit).find({ where: { user_id: user.id }, order: { pendingEndTime: "ASC" } });

        let workingDep = 0.0;

        for (let i = 0; i < deposits.length; i++) {

	    workingDep += deposits[i].amount;

            let orders = [];
            if (i == 0)
            orders = await getRepository(Order)
                            .createQueryBuilder("order")
			    .addOrderBy("order.ticket", "ASC")
                            .where("order.close_time > :date", { date: deposits[i].pendingEndTime })
			    .andWhere("order.close_time < :date1", { date1: deposits[i + 1].pendingEndTime })
			    .andWhere("order.type != 6")
			    .andWhere("order.close_balance != 0")
                            .getMany();
            else if (i == deposits.length - 1)
            orders = await getRepository(Order)
            .createQueryBuilder("order")
	    .addOrderBy("order.ticket", "ASC")
            .where("order.close_time > :date", { date: deposits[i].pendingEndTime })
	    .andWhere("order.type != 6")
	    .andWhere("order.close_balance != 0")
            .andWhere("order.close_time > :date1", { date1: deposits[i - 1].pendingEndTime })
            .getMany();
            else
            orders = await getRepository(Order)
            .createQueryBuilder("order")
	    .addOrderBy("order.ticket", "ASC")
            .where("order.close_time > :date", { date: deposits[i].pendingEndTime })
	    .andWhere("order.type != 6")
	    .andWhere("order.close_balance != 0")           
	    .andWhere("order.close_time < :date1", { date1: deposits[i + 1].pendingEndTime })
            .getMany();

//	    console.log(orders);

            for (let order of orders) {

                //if ((await getRepository(Profit).find({ where: { ticket: order.ticket } })).length > 0) return;

                let profit = new Profit();

                profit.user_id = user.id;
                profit.ticket = order.ticket;
                profit.depositFactor = workingDep / order.open_balance;
                profit.workingDeposit = workingDep;
                profit.profit = order.profit * profit.depositFactor / 2;
		console.log("(", user.id, ")", "[", order.ticket, "] ", order.profit, " * (", workingDep, " / ", order.open_balance, ") / 2 = ", profit.profit);
                await getRepository(Profit).save(profit);

            }
        }

        user.updateBalance();
	user.updateDeposits();

	await getRepository(User).save(user);

    }

}
