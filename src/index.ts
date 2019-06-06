import "reflect-metadata";
import {createConnection} from "typeorm";
import * as express from "express";
import * as bodyParser from "body-parser";
import routes from "./routes";

import * as helmet from "helmet";
import * as cors from "cors";
import * as cron from "node-cron";
import checkPendingDeposit from "./cron/checkPendingDeposit";

process.env.TZ = "UTC";

createConnection().then(async connection => {

    // create express app
    const app = express();
    app.use(helmet());
    app.use(cors());
    app.use(bodyParser.json());

    app.use("/api", routes);

    // start express server
    app.listen(3000);

    cron.schedule("*/10 * * * *", checkPendingDeposit);

    console.log("Express server has started on port 3000. Open http://localhost:3000/users to see results");

}).catch(error => console.log(error));
