# ---------------------------------------------------------------------------
# SQS + SNS: the async plumbing behind ShopPal's order and support flows.
#
# `support` currently POSTs to `notifications` over HTTP; a queue is what that
# would become at scale, so this is the shape the estate would take.
# ---------------------------------------------------------------------------

# !! GAP: unencrypted queue carrying order payloads (addresses, payment
# metadata), with a resource policy open to every principal - so anyone can
# both read the orders and inject forged ones.
resource "aws_sqs_queue" "order_events" {
  name                      = "${local.name}-order-events"
  message_retention_seconds = 345600
  visibility_timeout_seconds = 60

  # No kms_master_key_id and no sqs_managed_sse_enabled => encryption off.
  sqs_managed_sse_enabled = false

  tags = {
    Name      = "${local.name}-order-events"
    DataClass = "pii"
    Insecure  = "unencrypted-queue,wildcard-queue-policy"
  }
}

resource "aws_sqs_queue_policy" "order_events" {
  queue_url = aws_sqs_queue.order_events.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AnyoneCanUseThisQueue"
      Effect    = "Allow"
      Principal = "*"
      Action    = "sqs:*"
      Resource  = aws_sqs_queue.order_events.arn
    }]
  })
}

# The support queue, done properly: SSE on with a CMK, and a dead-letter queue.
resource "aws_sqs_queue" "support_events_dlq" {
  name                      = "${local.name}-support-events-dlq"
  kms_master_key_id         = aws_kms_key.app.id
  message_retention_seconds = 1209600

  tags = { Name = "${local.name}-support-events-dlq", Expected = "true" }
}

resource "aws_sqs_queue" "support_events" {
  name              = "${local.name}-support-events"
  kms_master_key_id = aws_kms_key.app.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.support_events_dlq.arn
    maxReceiveCount     = 5
  })

  tags = { Name = "${local.name}-support-events", Expected = "true" }
}

# ===========================================================================
# SNS
# ===========================================================================

# !! GAP: unencrypted topic that anyone may publish to or subscribe to.
# Subscribing leaks ticket contents; publishing lets an attacker fan out
# arbitrary notifications to customers.
resource "aws_sns_topic" "ticket_notifications" {
  name = "${local.name}-ticket-notifications"

  tags = {
    Name     = "${local.name}-ticket-notifications"
    Insecure = "unencrypted-topic,wildcard-topic-policy"
  }
}

resource "aws_sns_topic_policy" "ticket_notifications" {
  arn = aws_sns_topic.ticket_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AnyoneCanPublishOrSubscribe"
      Effect    = "Allow"
      Principal = "*"
      Action = [
        "SNS:Publish",
        "SNS:Subscribe",
        "SNS:Receive",
        "SNS:GetTopicAttributes",
      ]
      Resource = aws_sns_topic.ticket_notifications.arn
    }]
  })
}

resource "aws_sns_topic" "ops_alerts" {
  name              = "${local.name}-ops-alerts"
  kms_master_key_id = aws_kms_key.app.id

  tags = { Name = "${local.name}-ops-alerts", Expected = "true" }
}
