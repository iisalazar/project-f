import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrototypeModule } from './prototype/prototype.module';
import { OptimizationModule } from './optimization/optimization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    OptimizationModule,
    PrototypeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
