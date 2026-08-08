variable "project_name" {
  type        = string
  description = "Project name prefix for resource naming"
}

variable "environment" {
  type        = string
  description = "Environment (staging, production)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for RDS security group"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnets for RDS subnet group"
}

variable "allowed_security_groups" {
  type        = list(string)
  description = "Security groups allowed to connect (ECS, PgBouncer)"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "allocated_storage_gb" {
  type    = number
  default = 50
}

variable "max_allocated_storage_gb" {
  type    = number
  default = 200
}

variable "multi_az" {
  type    = bool
  default = true
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "postgres_version" {
  type    = string
  default = "16.4"
}

variable "max_connections" {
  type    = string
  default = "100"
}

variable "pgbouncer_host" {
  type        = string
  default     = ""
  description = "PgBouncer hostname for DATABASE_POOL_URL (set when PgBouncer is provisioned)"
}
