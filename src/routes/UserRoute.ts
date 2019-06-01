import { Router } from "express";
import UserController from "../controller/UserController";
import { JWTChecker } from "../middlewares/JWTChecker";
import { RoleChecker } from "../middlewares/RoleChecker";

const router = Router();

//Get all users
router.get("/", [JWTChecker, RoleChecker(["ADMIN"])], UserController.listAll);

// Get one user
router.get(
  "/:id([0-9]+)",
  [JWTChecker, RoleChecker(["ADMIN"])],
  UserController.getOneById
);

//Create a new user
router.post("/", UserController.newUser);

//Edit one user
router.patch(
  "/:id([0-9]+)",
  [JWTChecker, RoleChecker(["ADMIN"])],
  UserController.editUser
);

//Delete one user
router.delete(
  "/:id([0-9]+)",
  [JWTChecker, RoleChecker(["ADMIN"])],
  UserController.deleteUser
);

router.get("/confirmation", UserController.confirmEmail);

export default router;