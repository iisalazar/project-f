import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SqsModule } from '@ssut/nestjs-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import { AuthModule } from '../auth/auth.module';
import { OptimizationController } from './optimization.controller';
import { OptimizationV2Controller } from './optimization-v2.controller';
import { PlanController } from './plan.controller';
import { DispatchController } from './dispatch.controller';
import { DriverController } from './driver.controller';
import { RoutePlansController } from './route-plans.controller';
import { CreateOptimizationJobHandler } from './handlers/create-optimization-job.handler';
import { ListOptimizationJobsHandler } from './handlers/list-optimization-jobs.handler';
import { GetOptimizationJobHandler } from './handlers/get-optimization-job.handler';
import { CreateV2OptimizationHandler } from './handlers/create-v2-optimization.handler';
import { OptimizationProcessorService } from './services/optimization-processor.service';
import { OptimizationSqsHandler } from './optimization.sqs';
import { V2PayloadService } from './services/v2-payload.service';
import { DispatchService } from './services/dispatch.service';
import { DriverExecutionService } from './services/driver-execution.service';
import { RoutePlansService } from './services/route-plans.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    CqrsModule,
    SqsModule.registerAsync({
      useFactory: () => {
        const region = process.env.AWS_REGION ?? 'ap-southeast-1';
        const endpoint = process.env.SQS_ENDPOINT ?? 'http://localhost:4566';
        const sqs = new SQSClient({
          apiVersion: '2012-11-05',
          region,
          endpoint,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
          },
        });

        return {
          consumers: [
            {
              name: 'optimize-job-1',
              queueUrl: process.env.SQS_OPTIMIZE_QUEUE_URL ?? '',
              region,
              batchSize: 1,
              waitTimeSeconds: 10,
              visibilityTimeout: 30,
              sqs,
            },
            {
              name: 'optimize-job-2',
              queueUrl: process.env.SQS_OPTIMIZE_QUEUE_URL ?? '',
              region,
              batchSize: 1,
              waitTimeSeconds: 10,
              visibilityTimeout: 30,
              sqs,
            },
          ],
        };
      },
    }),
  ],
  controllers: [
    OptimizationController,
    OptimizationV2Controller,
    PlanController,
    DispatchController,
    DriverController,
    RoutePlansController,
  ],
  providers: [
    CreateOptimizationJobHandler,
    CreateV2OptimizationHandler,
    ListOptimizationJobsHandler,
    GetOptimizationJobHandler,
    OptimizationProcessorService,
    OptimizationSqsHandler,
    V2PayloadService,
    DispatchService,
    DriverExecutionService,
    RoutePlansService,
  ],
})
export class OptimizationModule {}
