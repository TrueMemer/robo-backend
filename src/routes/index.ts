import { Router } from "express";
import auth from "./AuthRoute";
import user from "./UserRoute";
import profile from "./ProfileRoute";
import payment from "./PaymentRoute";
import mt4 from "./MT4Route";

const routes = Router();

routes.use("/auth", auth);
routes.use("/user", user);
routes.use("/profile", profile);
routes.use("/payment", payment);
routes.use("/mt4", mt4);

export default routes;