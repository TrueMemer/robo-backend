import { Router } from 'express';

import { JWTChecker } from '../middlewares/JWTChecker';

import BlockIOController from "../controller/BlockIOController";

const router = Router();

router.post("/crypto/createPayment", [JWTChecker], BlockIOController.createPayment);
router.post("/crypto/checkPayment", [JWTChecker], BlockIOController.checkPayment);
router.post("/crypto/cancelPendingPayment", [JWTChecker], BlockIOController.cancelPendingTransaction);

export default router;