locals {
  api_base_url = "https://api.${var.domain_name}/api/v1"

  ecs_services = {
    auth-service = {
      port = 3001

      environment_variables = {
        NODE_ENV        = "production"
        PORT            = "3001"
        DATABASE_HOST   = aws_db_instance.postgres.address
        DATABASE_PORT   = tostring(aws_db_instance.postgres.port)
        DATABASE_NAME   = var.database_name
        DATABASE_USER   = var.database_username
        DATABASE_SCHEMA = "auth_service"
        JWT_EXPIRES_IN  = "1h"
      }

      secrets = {
        DATABASE_PASSWORD = aws_secretsmanager_secret.database_password.arn
        JWT_SECRET        = aws_secretsmanager_secret.jwt.arn
      }
    }

    pricing-service = {
      port = 3000

      environment_variables = {
        NODE_ENV        = "production"
        PORT            = "3000"
        DATABASE_HOST   = aws_db_instance.postgres.address
        DATABASE_PORT   = tostring(aws_db_instance.postgres.port)
        DATABASE_NAME   = var.database_name
        DATABASE_USER   = var.database_username
        DATABASE_SCHEMA = "pricing_service"
        JWT_EXPIRES_IN  = "1h"
      }

      secrets = {
        DATABASE_PASSWORD = aws_secretsmanager_secret.database_password.arn
        JWT_SECRET        = aws_secretsmanager_secret.jwt.arn
      }
    }

    admin-portal = {
      port = 4201

      environment_variables = {
        VITE_API_BASE_URL      = local.api_base_url
        VITE_AUTH_API_BASE_URL = local.api_base_url
      }

      secrets = {}
    }

    partner-portal = {
      port = 4200

      environment_variables = {
        VITE_API_BASE_URL      = local.api_base_url
        VITE_AUTH_API_BASE_URL = local.api_base_url
      }

      secrets = {}
    }
  }
}

module "ecs_service" {
  for_each = local.ecs_services

  source = "../ecs-service"

  project_name = var.project_name
  environment  = var.environment
  service_name = each.key
  aws_region   = var.aws_region

  cluster_id         = aws_ecs_cluster.main.id
  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_image = "${aws_ecr_repository.service[each.key].repository_url}:${var.service_image_tags[each.key]}"
  container_port  = each.value.port

  subnet_ids         = [for subnet in aws_subnet.private : subnet.id]
  security_group_ids = [aws_security_group.ecs.id]

  target_group_arn = aws_lb_target_group.service[each.key].arn
  log_group_name   = aws_cloudwatch_log_group.service[each.key].name

  environment_variables = each.value.environment_variables
  secrets               = each.value.secrets

  depends_on = [
    aws_iam_role_policy_attachment.ecs_execution,
    aws_iam_role_policy.ecs_secrets,
    aws_iam_role_policy.ecs_execute_command,
    aws_lb_listener.http,
  ]
}
