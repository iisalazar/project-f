import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DepotsController } from './depots.controller';
import { DepotsService } from './depots.service';

@Module({
  imports: [AuthModule],
  controllers: [DepotsController],
  providers: [DepotsService],
})
export class DepotsModule {}
