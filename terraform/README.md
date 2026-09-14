# AWS Infrastructure

This directory contains the Terraform configuration for running the pricing catalog platform on AWS.

## Architecture

The configuration provisions:

- one VPC across two Availability Zones
- two public subnets for the Application Load Balancer
- two private subnets for ECS tasks and PostgreSQL
- one NAT Gateway per Availability Zone
- one private, encrypted, multi-AZ RDS PostgreSQL instance
- one ECR repository for each application image
- one ECS Fargate cluster
- one reusable ECS service module instantiated four times
- one public Application Load Balancer with path-based routing
- one CloudWatch log group per service
- Secrets Manager secrets for the database password and JWT signing key

Traffic follows this path:

```text
Internet -> ALB -> ECS services -> RDS PostgreSQL
```

Only ECS tasks may connect to PostgreSQL on port 5432.

## Directory structure

```text
terraform/
├── main.tf
├── outputs.tf
├── providers.tf
├── variables.tf
├── versions.tf
├── terraform.tfvars.example
├── localstack/
└── modules/
    ├── platform/
    └── ecs-service/
```

The `platform` module contains the shared AWS infrastructure. The `ecs-service` module describes one Fargate task and
service and is reused for all four application containers.

## Variables

The main variables are:

| Variable             | Description                          | Default               |
|----------------------|--------------------------------------|-----------------------|
| `aws_region`         | AWS deployment region                | `eu-central-1`        |
| `project_name`       | Prefix used for AWS resources        | `pricing-catalog`     |
| `environment`        | Deployment environment               | `dev`                 |
| `domain_name`        | Public application domain            | `example.com`         |
| `service_image_tags` | Immutable image tag for each service | `latest` placeholders |

For a real deployment, copy the example file and replace the domain and image tags:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

The image tags should normally be Git commit SHAs produced by CI.

## Validate

Run from the repository root:

```bash
terraform -chdir=terraform init
terraform -chdir=terraform fmt -check
terraform -chdir=terraform validate
```

## Plan against AWS

Authenticate with the intended AWS account and run:

```bash
terraform -chdir=terraform plan -var-file=terraform.tfvars
```

The Terraform state backend is intentionally local for this exercise.

## Plan against LocalStack

Start LocalStack:

```bash
docker compose -f infrastructure/localstack-compose.yml up -d
```

Copy the supplied provider configuration if it has not already been copied:

```bash
cp infrastructure/localstack-provider.tf.example terraform/localstack/provider.tf
```

Initialize, validate and plan:

```bash
terraform -chdir=terraform/localstack init
terraform -chdir=terraform/localstack fmt -check
terraform -chdir=terraform/localstack validate
terraform -chdir=terraform/localstack plan
```

Stop LocalStack afterward:

```bash
docker compose -f infrastructure/localstack-compose.yml down -v
```

LocalStack is used only to verify that Terraform can create a plan. No `terraform apply` is required.

## Routing

The load balancer routes:

- `/api/v1/auth/*` to `auth-service`
- `/api/v1/pricing-catalogs/*`, `/api/v1/craftsmen/*`, and `/api/v1/trades/*` to `pricing-service`
- `/admin/*` to `admin-portal`
- `/app/*` and the default route to `partner-portal`

## Secrets

Terraform generates the RDS master password and JWT signing secret and stores them in AWS Secrets Manager.

The ECS task definitions inject them through `secrets` references. They are not hardcoded in task definitions or
variable files.

Because generated secret values are represented in Terraform state, state files must never be committed. A real
production deployment should use an encrypted remote backend with restricted access.

## Caveats

- DNS records and an ACM certificate are out of scope.
- The current ALB listener uses HTTP. Production requires HTTPS and an HTTP-to-HTTPS redirect.
- The configured domain must point its API, admin and app hostnames to the ALB.
- Container images must be built and pushed to ECR before ECS services can start.
- Database migrations and initial schema creation are application deployment steps and are not executed by Terraform.
- Vite environment variables are normally embedded at build time. Production portal images must either receive their API
  URLs during the image build or provide runtime configuration.
- NAT Gateways and multi-AZ RDS incur AWS costs if the configuration is applied.
- LocalStack Community does not fully emulate ECS Fargate or RDS; a successful plan is the verification target.
