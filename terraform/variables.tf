variable "aws_region" {
  description = "AWS region used for the infrastructure"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Name used as a prefix for AWS resources"
  type        = string
  default     = "pricing-catalog"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "Public base domain used by the application"
  type        = string
  default     = "example.com"
}

variable "service_image_tags" {
  description = "Container image tag used for each service"
  type        = map(string)

  default = {
    auth-service    = "latest"
    pricing-service = "latest"
    partner-portal  = "latest"
    admin-portal    = "latest"
  }
}
