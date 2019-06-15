import { Router } from 'express';

import { JWTChecker } from '../middlewares/JWTChecker';

import BlockIOController from "../controller/BlockIOController";
import LatyPayController from "../controller/LatyPayController";
import PayeerController from '../controller/PayeerController';
import PerfectMoneyController from '../controller/PerfectMoneyController';

const router = Router();

router.post("/crypto/createPayment", [JWTChecker], BlockIOController.createPayment);
router.post("/crypto/checkPayment", [JWTChecker], BlockIOController.checkPayment);
router.post("/crypto/cancelPendingPayment", [JWTChecker], BlockIOController.cancelPendingTransaction);

router.post("/letypay/status", LatyPayController.status);
router.post("/letypay/fail", LatyPayController.fail);
router.post("/letypay/success", LatyPayController.success);

router.post("/payeer/status", PayeerController.status);
router.get("/payeer/fail", PayeerController.fail);
router.get("/payeer/success", PayeerController.success);

router.post("/pm/status", PerfectMoneyController.status);
router.post("/pm/fail", PerfectMoneyController.fail);

export default router;