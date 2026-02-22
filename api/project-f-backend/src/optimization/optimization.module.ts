import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SqsModule } from '@ssut/nestjs-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import { OptimizationController } from './optimization.controller';
import { CreateOptimizationJobHandler } from './handlers/create-optimization-job.handler';
import { ListOptimizationJobsHandler } from './handlers/list-optimization-jobs.handler';
import { GetOptimizationJobHandler } from './handlers/get-optimization-job.handler';
import { OptimizationProcessorService } from './services/optimization-processor.service';
import { OptimizationSqsHandler } from './optimization.sqs';

@Module({
  imports: [
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
  controllers: [OptimizationController],
  providers: [
    CreateOptimizationJobHandler,
    ListOptimizationJobsHandler,
    GetOptimizationJobHandler,
    OptimizationProcessorService,
    OptimizationSqsHandler,
  ],
})
export class OptimizationModule {}
