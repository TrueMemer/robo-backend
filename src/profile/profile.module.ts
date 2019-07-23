import { Module, MiddlewareConsumer, RequestMethod, NestModule } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { AuthModule } from '../auth/auth.module';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/auth.constants';
import { AuthMiddleware } from '../auth/auth.middleware';

@Module({
	imports: [UserModule],
  	controllers: [ProfileController],
  	providers: [ProfileService]
})
export class ProfileModule {

}
