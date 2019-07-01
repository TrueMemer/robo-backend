import { Controller, Get, Post } from "@overnightjs/core";
import { Request, Response } from "express-serve-static-core";

function execShellCommand(cmd) {
    const exec = require("child_process").exec;
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
            }
            resolve(stdout ? stdout : stderr);
        });
    });
}

@Controller("api/calculator")
export class CalculateController {

    @Post("")
    private async calculate(req: Request, res: Response) {

        const { amount, months, reinvestInterval } = req.body;

        console.log(`../../lib/calc ${amount} ${months} ${reinvestInterval}`);

        const output = await execShellCommand(`./lib/calc ${amount} ${months} ${reinvestInterval}`);

        return res.status(200).send({ result: output });
    }

}