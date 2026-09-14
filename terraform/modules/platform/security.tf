locals {
  application_ports = toset(["3000", "3001", "4200", "4201"])
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb"
  description = "Allow public HTTP traffic to the application load balancer"
  vpc_id      = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id

  description = "Public HTTP access"
  cidr_ipv4   = "0.0.0.0/0"
  from_port   = 80
  to_port     = 80
  ip_protocol = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "alb" {
  security_group_id = aws_security_group.alb.id

  cidr_ipv4   = "0.0.0.0/0"
  ip_protocol = "-1"
}

resource "aws_security_group" "ecs" {
  name        = "${local.name_prefix}-ecs"
  description = "Allow traffic from the load balancer to ECS services"
  vpc_id      = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs"
  })
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb" {
  for_each = local.application_ports

  security_group_id = aws_security_group.ecs.id

  description                  = "Application port ${each.value} from ALB"
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = tonumber(each.value)
  to_port                      = tonumber(each.value)
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "ecs" {
  security_group_id = aws_security_group.ecs.id

  cidr_ipv4   = "0.0.0.0/0"
  ip_protocol = "-1"
}

resource "aws_security_group" "database" {
  name        = "${local.name_prefix}-database"
  description = "Allow PostgreSQL traffic from ECS services"
  vpc_id      = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database"
  })
}

resource "aws_vpc_security_group_ingress_rule" "database_from_ecs" {
  security_group_id = aws_security_group.database.id

  description                  = "PostgreSQL access from ECS"
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "database" {
  security_group_id = aws_security_group.database.id

  cidr_ipv4   = "0.0.0.0/0"
  ip_protocol = "-1"
}
