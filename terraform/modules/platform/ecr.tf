locals {
  container_repositories = toset([
    "auth-service",
    "pricing-service",
    "partner-portal",
    "admin-portal",
  ])
}

resource "aws_ecr_repository" "service" {
  for_each = local.container_repositories

  name                 = "${local.name_prefix}/${each.value}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-${each.value}"
    Service = each.value
  })
}

resource "aws_ecr_lifecycle_policy" "service" {
  for_each = aws_ecr_repository.service

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the latest 20 container images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
