import "reflect-metadata";
import {createConnection} from "typeorm";
import * as express from "express";
import * as bodyParser from "body-parser";
import routes from "./routes";

import * as helmet from "helmet";
import * as cors from "cors";
import * as cron from "node-cron";
import * as compression from "compression";
import * as morgan from "morgan";
import checkPendingDeposit from "./cron/checkPendingDeposit";
import recalculateProfits from "./cron/recalculateProfits";

process.env.TZ = "UTC";

createConnection().then(async () => {

    // create express app
    const app = express();
    app.use(compression());
    app.use(helmet());
    app.use(cors());
    app.use(bodyParser.json());
    app.use(morgan('dev'));

    app.use("/api", routes);

    await recalculateProfits();

    // start express server
    app.listen(3000);

    cron.schedule("*/10 * * * *", checkPendingDeposit);

    console.log("Express server has started on port 3000.");

}).catch(error => console.log(error));
