import { Server } from "@overnightjs/core";
import { Logger } from "@overnightjs/logger";
import bodyParser = require("body-parser");
import compression = require("compression");
import cors = require("cors");
import helmet = require("helmet");
import morgan = require("morgan");
import cron = require("node-cron");
import { createConnection } from "typeorm";

import * as controllers from "./controller";
import checkPendingDeposit from "./cron/checkPendingDeposit";
import recalculateProfits from "./cron/recalculateProfits";

export default class RoboServer extends Server {

    private readonly SERVER_START_MSG = "Express server is listening on port ";

    constructor() {
        super(process.env.NODE_ENV === "development");
        this.app.use(compression());
        this.app.use(helmet());
        this.app.use(cors());
        if (process.env.NODE_ENV === "development") {
            this.app.use(morgan("dev"));
        }
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.set("trust proxy", true);
        this.setupDatabase();
        this.setupCron();
        this.setupControllers();
    }

    public start(port: number): void {
        this.app.listen(port, () => {
            Logger.Imp(this.SERVER_START_MSG + port);
        });
    }

    private setupDatabase() {
        createConnection().then(() => {
            //recalculateProfits();
        });
    }

    private setupControllers() {
        const ctlrInstances = [];
        for (const name in controllers) {
            if (controllers.hasOwnProperty(name)) {
                const Controller = (controllers as any)[name];
                ctlrInstances.push(new Controller());
            }
        }
        super.addControllers(ctlrInstances);
    }

    private setupCron() {
        cron.schedule("*/10 * * * *", checkPendingDeposit);
    }

}
