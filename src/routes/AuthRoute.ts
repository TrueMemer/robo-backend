import { Router } from 'express';

import AuthController from '../controller/AuthController';
import { JWTChecker } from '../middlewares/JWTChecker';

const router = Router();

router.post("/login", AuthController.login);

router.post("/change-password", [JWTChecker], AuthController.changePassword);

export default router;