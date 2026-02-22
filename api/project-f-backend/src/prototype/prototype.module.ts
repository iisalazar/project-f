import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrototypeController } from './prototype.controller';
import { PrototypeTestHandler } from './handlers/prototype-test.handler';

@Module({
  imports: [CqrsModule],
  controllers: [PrototypeController],
  providers: [PrototypeTestHandler],
})
export class PrototypeModule {}
