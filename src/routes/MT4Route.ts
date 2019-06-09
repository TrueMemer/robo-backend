import { Router } from 'express';
import MT4Controller from '../controller/MT4Controller';

const router = Router();

router.post("/updateorders", MT4Controller.updateOrders);

export default router;