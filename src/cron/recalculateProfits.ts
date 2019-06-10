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

        const deposits : Deposit[] = await getRepository(Deposit).find({ where: { user_id: user.id }});

        let workingDep = 0.0;

        for (let i = 0; i < deposits.length; i++) {
            workingDep += deposits[i].amount;

            const orders = await getRepository(Order).find({ where: { close_time: LessThan(deposits[i + 1].pendingEndTime) } });

            for (let order of orders) {

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