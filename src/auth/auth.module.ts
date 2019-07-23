import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from "@nestjs/jwt";
import { jwtConstants } from './auth.constants';
import { JwtStrategy } from './jwt.strategy';
import { AuthMiddleware } from './auth.middleware';

@Global()
@Module({
	imports: [
		UserModule,
		JwtModule.register({
			secret: jwtConstants.secret,
			signOptions: { expiresIn: "1h" }
		})
	],
  	providers: [AuthService, LocalStrategy, JwtStrategy, AuthMiddleware],
  	controllers: [AuthController],
  	exports: [AuthService]
})
export class AuthModule {}
