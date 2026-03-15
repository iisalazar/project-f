import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

const config = new pulumi.Config();
const queueName = config.get('queueName') ?? 'optimize-job';

// When sqsEndpoint is set (dev/local), route traffic to LocalStack.
// When absent (prod), use real AWS — no custom provider needed.
const sqsEndpoint = config.get('sqsEndpoint');

const provider = sqsEndpoint
  ? new aws.Provider('localstack', {
      region: 'ap-southeast-1',
      accessKey: 'test',
      secretKey: 'test',
      s3UsePathStyle: true,
      skipCredentialsValidation: true,
      skipMetadataApiCheck: true,
      skipRequestingAccountId: true,
      endpoints: [{ sqs: sqsEndpoint }],
    })
  : undefined;

const resourceOpts: pulumi.ResourceOptions = provider ? { provider } : {};

// Dead-letter queue — receives messages after 3 failed processing attempts
const dlq = new aws.sqs.Queue(
  'optimizeJobDlq',
  {
    name: `${queueName}-dlq`,
    messageRetentionSeconds: 1209600, // 14 days
  },
  resourceOpts,
);

const queue = new aws.sqs.Queue(
  'optimizeJobQueue',
  {
    name: queueName,
    visibilityTimeoutSeconds: 30,
    messageRetentionSeconds: 86400,
    redrivePolicy: {
      deadLetterTargetArn: dlq.arn,
      maxReceiveCount: 3,
    },
  },
  resourceOpts,
);

// ── EC2 infrastructure (prod only) ──────────────────────────────────────────
if (!sqsEndpoint) {
  const keyPair = new aws.ec2.KeyPair('projectf-key', {
    publicKey: config.require('sshPublicKey'),
  });

  const sg = new aws.ec2.SecurityGroup('projectf-sg', {
    description: 'Project F EC2 security group',
    ingress: [
      { protocol: 'tcp', fromPort: 22,  toPort: 22,  cidrBlocks: ['0.0.0.0/0'], description: 'SSH' },
      { protocol: 'tcp', fromPort: 80,  toPort: 80,  cidrBlocks: ['0.0.0.0/0'], description: 'HTTP' },
      { protocol: 'tcp', fromPort: 443, toPort: 443, cidrBlocks: ['0.0.0.0/0'], description: 'HTTPS' },
    ],
    egress: [
      { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
    ],
  });

  // Ubuntu 22.04 LTS in ap-southeast-1 — verify AMI ID before first deploy:
  //   aws ec2 describe-images --owners 099720109477 \
  //     --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  //     --query 'sort_by(Images,&CreationDate)[-1].ImageId' --region ap-southeast-1
  const instance = new aws.ec2.Instance('projectf-ec2', {
    ami: 'ami-01811d4912b4ccb26',
    instanceType: 't3.medium',
    keyName: keyPair.keyName,
    vpcSecurityGroupIds: [sg.id],
    rootBlockDevice: { volumeSize: 30, volumeType: 'gp3' },
    userData: `#!/bin/bash
set -euo pipefail
apt-get update -y
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
apt-get install -y git
su - ubuntu -c "git clone https://github.com/iisalazar/project-f.git ~/app"
mkdir -p /home/ubuntu/app/data/osrm
chown -R ubuntu:ubuntu /home/ubuntu/app
`,
    tags: { Name: 'project-f' },
  });

  const eip = new aws.ec2.Eip('projectf-eip', { instance: instance.id });
  exports.instanceIp = eip.publicIp;
}

export const sqsQueueUrl = queue.url;
export const sqsDlqUrl = dlq.url;
// kept for backwards-compat with any scripts referencing queueUrl
export const queueUrl = queue.url;
