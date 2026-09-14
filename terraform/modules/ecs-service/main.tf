locals {
  name_prefix = "${var.project_name}-${var.environment}-${var.service_name}"
}

resource "aws_ecs_task_definition" "main" {
  family = local.name_prefix

  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.cpu)
  memory                   = tostring(var.memory)

  execution_role_arn = var.execution_role_arn
  task_role_arn      = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = var.container_image
      essential = true

      portMappings = [
        {
          name          = "${var.service_name}-http"
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]

      environment = [
        for name, value in var.environment_variables : {
          name  = name
          value = value
        }
      ]

      secrets = [
        for name, value_from in var.secrets : {
          name      = name
          valueFrom = value_from
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = var.log_group_name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = var.service_name
        }
      }
    }
  ])

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Service     = var.service_name
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecs_service" "main" {
  name    = local.name_prefix
  cluster = var.cluster_id

  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.desired_count

  launch_type      = "FARGATE"
  platform_version = "LATEST"

  enable_execute_command = true

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.service_name
    container_port   = var.container_port
  }

  health_check_grace_period_seconds = 60
  propagate_tags                    = "SERVICE"

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Service     = var.service_name
    ManagedBy   = "Terraform"
  }
}
