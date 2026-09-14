variable "project_name" {
  description = "Project name used for resource names"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "service_name" {
  description = "Name of the application service"
  type        = string
}

variable "aws_region" {
  description = "AWS region used by the CloudWatch log driver"
  type        = string
}

variable "cluster_id" {
  description = "ID of the ECS cluster"
  type        = string
}

variable "execution_role_arn" {
  description = "IAM role used by ECS to pull images, write logs and read secrets"
  type        = string
}

variable "task_role_arn" {
  description = "IAM role assumed by the running application"
  type        = string
}

variable "container_image" {
  description = "Complete container image URI including its tag"
  type        = string
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
}

variable "subnet_ids" {
  description = "Private subnet IDs used by the ECS tasks"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups assigned to the ECS tasks"
  type        = list(string)
}

variable "target_group_arn" {
  description = "ARN of the load balancer target group"
  type        = string
}

variable "log_group_name" {
  description = "CloudWatch log group used by the container"
  type        = string
}

variable "environment_variables" {
  description = "Non-sensitive environment variables passed to the container"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Environment variable names mapped to Secrets Manager ARNs"
  type        = map(string)
  default     = {}
}

variable "cpu" {
  description = "CPU units assigned to the Fargate task"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory in MiB assigned to the Fargate task"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of running ECS tasks"
  type        = number
  default     = 1
}
