import { Router } from 'express';

import { JWTChecker } from '../middlewares/JWTChecker';

import BlockIOController from "../controller/BlockIOController";
import LatyPayController from "../controller/LatyPayController";
import PayeerController from '../controller/PayeerController';

const router = Router();

router.post("/crypto/createPayment", [JWTChecker], BlockIOController.createPayment);
router.post("/crypto/checkPayment", [JWTChecker], BlockIOController.checkPayment);
router.post("/crypto/cancelPendingPayment", [JWTChecker], BlockIOController.cancelPendingTransaction);

router.post("/letypay/status", LatyPayController.status);
router.post("/letypay/fail", LatyPayController.fail);
router.post("/letypay/success", LatyPayController.success);

router.post("/payeer/status", PayeerController.status);
router.post("/payeer/fail", PayeerController.fail);
router.post("/payeer/success", PayeerController.success);

export default router;