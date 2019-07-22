import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigService } from './config/config.service';
import { ConfigModule } from './config/config.module';
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserService } from './user/user.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
  		ConfigModule,
  		TypeOrmModule.forRoot({
  			type: "postgres",
  			host: process.env.DATABASE_HOST,
  			port: parseInt(process.env.DATABASE_PORT),
  			username: process.env.DATABASE_USER,
  			password: process.env.DATABASE_PASSWORD,
  			database: process.env.DATABASE_NAME,
  			entities: [__dirname + '/**/*.entity{.ts,.js}'],
      		synchronize: true,
  		}),
  		UserModule,
  		AuthModule,
  		ProfileModule
  	],
  controllers: [AppController],
})
export class AppModule {
	constructor(config: ConfigService) {

	}
}
