import { Router } from "express";
import auth from "./AuthRoute";
import user from "./UserRoute";
import profile from "./ProfileRoute";
import payment from "./PaymentRoute";

const routes = Router();

routes.use("/auth", auth);
routes.use("/user", user);
routes.use("/profile", profile);
routes.use("/payment", payment);

export default routes;