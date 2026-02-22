import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

const config = new pulumi.Config();
const queueName = config.get('queueName') ?? 'optimize-job';

const provider = new aws.Provider('localstack', {
  region: 'ap-southeast-1',
  accessKey: 'test',
  secretKey: 'test',
  s3UsePathStyle: true,
  skipCredentialsValidation: true,
  skipMetadataApiCheck: true,
  skipRequestingAccountId: true,
  endpoints: [
    {
      sqs: 'http://localhost:4566',
    },
  ],
});

const queue = new aws.sqs.Queue(
  'optimizeJobQueue',
  {
    name: queueName,
    visibilityTimeoutSeconds: 30,
    messageRetentionSeconds: 86400,
  },
  { provider },
);

export const queueUrl = queue.url;
