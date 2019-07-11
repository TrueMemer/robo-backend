import axios, { AxiosInstance } from "axios";
import config from "../config/config";
import * as xmljs from "xml-js";
import * as crypto from "crypto";
import * as fs from "fs";

export class PayinPayout {

    public static API_ENDPOINT = "https://lk.payin-payout.net/api_out/";
    public static CWD = process.cwd();
    public static AGENT_ID = config.payin_payout.agentId;
    public static HASH_ALG = "SHA1";
    public static PROTO_VER = 1;
    public static KEY_PATH = `${PayinPayout.CWD}/private/secret.key.pem`;

    public static init() {

        this.http = axios.create({
            baseURL: this.API_ENDPOINT,
            timeout: 1000,
            headers: {
                "Amega-Hash-Alg": this.HASH_ALG,
                "Amega-UserId": this.AGENT_ID,
                "Amega-ProtocolVersion": this.PROTO_VER
            }
        });

        this.getBalance();

    }

    public static getBalance() {

        const request = {
            _declaration: {
                _attributes: {
                    encoding: "utf-8",
                    version: "1.0"
                }
            },
            request: {
                action: {
                    _attributes: {
                        id: "Agents.getBalance"
                    },
                }
            }
        };

        const xml = xmljs.js2xml(request, { compact: true });

        let s = crypto.createSign(this.HASH_ALG);
        s.write(xml);
        s.end();

        const signature = s.sign(fs.readFileSync(this.KEY_PATH));

        console.log(signature);
    }

    private static http: AxiosInstance;

}