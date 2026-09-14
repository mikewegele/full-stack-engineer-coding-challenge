output "vpc_id" {
  description = "ID of the platform VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [for subnet in aws_subnet.public : subnet.id]
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = [for subnet in aws_subnet.private : subnet.id]
}

output "alb_dns_name" {
  description = "Public DNS name of the application load balancer"
  value       = aws_lb.main.dns_name
}

output "database_endpoint" {
  description = "Address of the PostgreSQL database"
  value       = aws_db_instance.postgres.address
}

output "ecr_repository_urls" {
  description = "ECR repository URL for each application service"

  value = {
    for name, repository in aws_ecr_repository.service :
    name => repository.repository_url
  }
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}
