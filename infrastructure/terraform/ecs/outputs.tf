output "cluster_id" {
  value       = aws_ecs_cluster.this.id
  description = "ID of the ECS cluster"
}

output "cluster_name" {
  value       = aws_ecs_cluster.this.name
  description = "Name of the ECS cluster"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "Public DNS name of the Application Load Balancer"
}

output "api_target_group_arn" {
  value       = aws_lb_target_group.api.arn
  description = "ARN of API Target Group"
}

output "web_target_group_arn" {
  value       = aws_lb_target_group.web.arn
  description = "ARN of Web Target Group"
}
