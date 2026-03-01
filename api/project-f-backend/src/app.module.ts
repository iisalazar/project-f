import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrototypeModule } from './prototype/prototype.module';
import { OptimizationModule } from './optimization/optimization.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DepotsModule } from './depots/depots.module';
import { StopsModule } from './stops/stops.module';
import { NotificationsModule } from './notifications/notifications.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    OptimizationModule,
    DriversModule,
    VehiclesModule,
    DepotsModule,
    StopsModule,
    NotificationsModule,
    IntegrationsModule,
    AnalyticsModule,
    PrototypeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
