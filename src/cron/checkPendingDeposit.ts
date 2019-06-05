import { getRepository } from "typeorm";
import { User } from "../entity/User";

export default async () => {

    console.log("Checking pending deposits...");

    let users: User[];

    try {
        users = await getRepository(User).find();
    } catch(error) {
        console.error("checkPendingDeposit cron failed");
        console.error(error);
        return;
    }

    let count = 0;

    for (let u of users) {
        if (u.pendingEndTime.getTime() <= Date.now() && u.pendingDeposit != 0) {
            u.workingDeposit += u.pendingDeposit;
            u.pendingDeposit = 0;
            u.pendingEndTime = new Date(0);

            await getRepository(User).save(u);

            count++;
        }
    }

    console.log(`Updated ${count} pending deposits`);

}