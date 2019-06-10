import { getRepository, LessThan, getConnection } from "typeorm";
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

            let orders = [];

            orders = await getRepository(Order)
                            .createQueryBuilder("order")
                            .where("order.close_time < :date", { date: deposits[i].pendingEndTime })
                            .getMany();

            for (let order of orders) {

                if ((await getRepository(Profit).find({ where: { ticket: order.ticket } })).length > 0) return;

                let profit = new Profit();

                profit.user_id = user.id;
                profit.ticket = order.ticket;
                profit.depositFactor = workingDep / order.open_balance;
                profit.profit = order.profit * profit.depositFactor / 2;

                await getRepository(Profit).save(profit);

            }
        }

        

    }

}