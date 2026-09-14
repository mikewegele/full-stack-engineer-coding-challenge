locals {
  service_ports = {
    auth-service    = 3001
    pricing-service = 3000
    partner-portal  = 4200
    admin-portal    = 4201
  }

  service_health_paths = {
    auth-service    = "/api/v1/health"
    pricing-service = "/api/v1/health"
    partner-portal  = "/"
    admin-portal    = "/"
  }
}

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"

  security_groups = [aws_security_group.alb.id]
  subnets         = [for subnet in aws_subnet.public : subnet.id]

  enable_deletion_protection = false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

resource "aws_lb_target_group" "service" {
  for_each = local.service_ports

  name        = substr("${local.name_prefix}-${each.key}", 0, 32)
  port        = each.value
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = local.service_health_paths[each.key]
    protocol            = "HTTP"
    port                = "traffic-port"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["partner-portal"].arn
  }
}

resource "aws_lb_listener_rule" "auth_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["auth-service"].arn
  }

  condition {
    path_pattern {
      values = [
        "/api/v1/auth",
        "/api/v1/auth/*",
      ]
    }
  }
}

resource "aws_lb_listener_rule" "pricing_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["pricing-service"].arn
  }

  condition {
    path_pattern {
      values = [
        "/api/v1/pricing-catalogs*",
        "/api/v1/craftsmen*",
        "/api/v1/trades*",
      ]
    }
  }
}

resource "aws_lb_listener_rule" "admin_portal" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["admin-portal"].arn
  }

  condition {
    path_pattern {
      values = [
        "/admin",
        "/admin/*",
      ]
    }
  }
}

resource "aws_lb_listener_rule" "partner_portal" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 40

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["partner-portal"].arn
  }

  condition {
    path_pattern {
      values = [
        "/app",
        "/app/*",
      ]
    }
  }
}
