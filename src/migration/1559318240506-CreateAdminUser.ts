import {MigrationInterface, QueryRunner, getRepository} from "typeorm";
import { User, UserRole } from "../entity/User";

export class CreateAdminUser1559318240506 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        let user = new User();
        user.username = "admin";
        user.password = "admin";
        user.email = "admin@test.ru";
        user.isVerified = true;
        user.balance = 0;
        user.hashPassword();
        user.role = UserRole.ADMIN;
        const userRepository = getRepository(User);
        await userRepository.save(user);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        const userRepository = getRepository(User);
        userRepository.delete({ username: "admin" });
    }

}
