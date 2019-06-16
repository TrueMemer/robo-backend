import { getRepository } from "typeorm";
import Deposit, { DepositStatus } from "../entity/Deposit";
import User from "../entity/User";

export default async () => {

    console.log("Checking pending deposits...");

    let deposits: Deposit[];

    try {
        deposits = await getRepository(Deposit).find({ where: { status: DepositStatus.PENDING }});
    } catch (error) {
        console.error("checkPendingDeposit cron failed");
        console.error(error);
        return;
    }

    let count = 0;

    for (const d of deposits) {
        if (d.pendingEndTime.getTime() <= Date.now()) {
            d.status = DepositStatus.WORKING;

            await getRepository(Deposit).save(d);

            const user = await getRepository(User).findOneOrFail(d.user_id);
            await user.updateDeposits();
            user.updateBalance();

            await getRepository(User).save(user);

            count++;
        }
    }

    console.log(`Updated ${count} pending deposits`);

};
