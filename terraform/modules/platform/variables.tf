variable "project_name" {
  description = "Name used as a prefix for AWS resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Two availability zones used by the platform"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) == 2
    error_message = "Exactly two availability zones must be provided."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the two public subnets"
  type        = list(string)
  default     = ["10.0.0.0/24", "10.0.1.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 2
    error_message = "Exactly two public subnet CIDRs must be provided."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the two private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) == 2
    error_message = "Exactly two private subnet CIDRs must be provided."
  }
}

variable "database_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "pricing"
}

variable "database_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "pricing_admin"
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "aws_region" {
  description = "AWS region used by the platform"
  type        = string
}

variable "service_image_tags" {
  description = "Container image tag used for each ECS service"
  type        = map(string)

  default = {
    auth-service    = "latest"
    pricing-service = "latest"
    partner-portal  = "latest"
    admin-portal    = "latest"
  }
}

variable "domain_name" {
  description = "Public base domain used by the application"
  type        = string
  default     = "example.com"
}
