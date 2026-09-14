module "platform" {
  source = "./modules/platform"

  project_name = var.project_name
  environment  = var.environment

  availability_zones = [
    "${var.aws_region}a",
    "${var.aws_region}b",
  ]

  aws_region         = var.aws_region
  domain_name        = var.domain_name
  service_image_tags = var.service_image_tags
}
