import { Router } from "express";
import auth from "./AuthRoute";
import user from "./UserRoute";

const routes = Router();

routes.use("/auth", auth);
routes.use("/user", user);

export default routes;