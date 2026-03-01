import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StopsController } from './stops.controller';
import { StopsService } from './stops.service';

@Module({
  imports: [AuthModule],
  controllers: [StopsController],
  providers: [StopsService],
})
export class StopsModule {}
