resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "database_password" {
  name                    = "${local.name_prefix}/database/password"
  description             = "Password for the pricing PostgreSQL database"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "database_password" {
  secret_id     = aws_secretsmanager_secret.database_password.id
  secret_string = random_password.database.result
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.name_prefix}/auth/jwt"
  description             = "JWT signing secret used by the application services"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt.result
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-database"
  subnet_ids = [for subnet in aws_subnet.private : subnet.id]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database"
  })
}

resource "aws_db_instance" "postgres" {
  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  instance_class = var.database_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.database_username
  password = random_password.database.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false
  multi_az               = true

  backup_retention_period    = 7
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  deletion_protection = false
  skip_final_snapshot = true
  apply_immediately   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres"
  })

  depends_on = [
    aws_route_table_association.private,
  ]
}
