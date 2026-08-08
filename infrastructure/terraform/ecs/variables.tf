variable "project_name" {
  type        = string
  default     = "qa-automater"
  description = "Name of the project"
}

variable "environment" {
  type        = string
  default     = "staging"
  description = "Deployment environment (staging/production)"
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS Region"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where ECS tasks and ALB will be deployed"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for ALB"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for ECS tasks"
}

variable "ecr_repository_url" {
  type        = string
  description = "Base URL of ECR repository containing container images"
}

variable "image_tag" {
  type        = string
  default     = "latest"
  description = "Docker image tag to deploy"
}
