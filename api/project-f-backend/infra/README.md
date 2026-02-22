# Project F Localstack Infra (Pulumi)

This Pulumi project provisions a standard SQS queue in Localstack.

## Prereqs
- Localstack running on `http://localhost:4566`
- Pulumi CLI installed and logged in (local backend is fine)

## Setup
```bash
cd api/project-f-backend/infra
npm install
pulumi stack init dev
pulumi config set queueName optimize-job
pulumi up
```

## Output
- `queueUrl` is printed after `pulumi up`.

Use it in the API `.env`:
```
SQS_OPTIMIZE_QUEUE_URL=<queueUrl>
```
