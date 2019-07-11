import { ViewEntity, Connection, ViewColumn } from "typeorm";
import Profit, { ProfitType } from "./Profit";
import User, { UserRole } from "./User";

@ViewEntity({
    expression: (conn: Connection) => conn.createQueryBuilder()
        .select("id", "id")
        .addSelect("username", "username")
        .addSelect("email", "email")
        .addSelect("\"isVerified\"", "isVerified")
        .addSelect("role", "role")
        .from(User, "user")
})
export default class UserView {

    @ViewColumn()
    public id: number;

    @ViewColumn()
    public username: string;

    @ViewColumn()
    public email: string;

    @ViewColumn()
    public isVerified: boolean;

    @ViewColumn()
    public role: UserRole;

    // @ViewColumn()
    // public profitTotal: number;

    // @ViewColumn()
    // public withdrawedTotal: number;

    // @ViewColumn()
    // public freeDeposit: number;

    // @ViewColumn()
    // public balance: number;

    // @ViewColumn()
    // public bonus: number;

    // @ViewColumn()
    // public workingDeposit: number;

}