# ---------------------------------------------------------------------------
# Lambda: the image thumbnailer that fires on product-image uploads.
# ---------------------------------------------------------------------------

data "archive_file" "thumbnailer" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_src"
  output_path = "${path.module}/.build/thumbnailer.zip"
}

# !! GAP: several at once -
#   - environment variables carry the DB password and a static IAM secret, and
#     any principal with lambda:GetFunctionConfiguration can read them back;
#   - the execution role is the account-wide admin policy;
#   - env vars are not encrypted with a CMK;
#   - the runtime is years past end of support;
#   - no VPC config, no reserved concurrency, no dead-letter target.
resource "aws_lambda_function" "thumbnailer" {
  function_name = "${local.name}-image-thumbnailer"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs16.x"
  timeout       = 30
  memory_size   = 512

  filename         = data.archive_file.thumbnailer.output_path
  source_code_hash = data.archive_file.thumbnailer.output_base64sha256

  environment {
    variables = {
      IMAGE_BUCKET          = aws_s3_bucket.product_images.id
      DB_CONNECTION_URL     = "postgres://${local.db_master_username}:${local.db_master_password}@${aws_db_instance.primary.address}:5432/shoppal"
      JWT_SECRET            = "b7f3c1d9e2a84f60b5c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3"
      AWS_UPLOAD_KEY_ID     = aws_iam_access_key.app_service_account.id
      AWS_UPLOAD_KEY_SECRET = aws_iam_access_key.app_service_account.secret
    }
  }

  tags = {
    Name     = "${local.name}-image-thumbnailer"
    Insecure = "secrets-in-env-vars,admin-execution-role,eol-runtime,no-dlq"
  }
}

# !! GAP: a resource policy that lets anyone on the internet invoke the
# function anonymously.
resource "aws_lambda_permission" "public_invoke" {
  statement_id  = "AllowPublicInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.thumbnailer.function_name
  principal     = "*"
}
