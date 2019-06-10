import { Router } from 'express';

import { JWTChecker } from '../middlewares/JWTChecker';
import ProfileController from '../controller/ProfileController';

const router = Router();

router.get("/", [JWTChecker], ProfileController.me);
router.get("/addBalanceHistory", [JWTChecker], ProfileController.addBalanceHistory);
router.get("/getDeposits", [JWTChecker], ProfileController.deposits);
router.get("/getProfits", [JWTChecker], ProfileController.profits);

export default router;