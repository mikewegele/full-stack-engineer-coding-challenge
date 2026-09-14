module "platform" {
  source = "../modules/platform"

  project_name = "pricing-catalog"
  environment  = "local"
  aws_region   = "eu-central-1"

  availability_zones = [
    "eu-central-1a",
    "eu-central-1b",
  ]
}
