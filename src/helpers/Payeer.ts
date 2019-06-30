import Axios from "axios";
import config from "../config/config";

export default class Payeer {

    public async CheckWithdraw(amount: number, account_no: number) : Promise<boolean> {

        const request = await Axios.post(
            "https://payeer.com/ajax/api/api.php?initOutput",
            {
                account: config.payeer.no,
                apiId: config.payeer.api.id,
                apiPass: config.payeer.api.secret_key,
                action: "initOutput",
                ps: 1136053,
                sumIn: amount,
                curIn: "USD",
                param_ACCOUNT_NUMBER: account_no
            }
        );

        

    }

}