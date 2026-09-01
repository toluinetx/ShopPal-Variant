# ---------------------------------------------------------------------------
# Route 53 + ACM: the public names in front of the estate.
#
# These matter to a traversal scanner because DNS is how it pivots from "an IP
# in an account" to "a customer-facing hostname", and because the records
# below advertise internal infrastructure.
# ---------------------------------------------------------------------------

resource "aws_route53_zone" "public" {
  name    = "shoppal-demo.example.com"
  comment = "ShopPal public zone (simulated)"

  tags = { Name = "shoppal-demo.example.com" }
}

resource "aws_route53_record" "shop" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "shop.shoppal-demo.example.com"
  type    = "CNAME"
  ttl     = 300
  records = [aws_lb.public.dns_name]
}

resource "aws_route53_record" "admin" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "admin.shoppal-demo.example.com"
  type    = "CNAME"
  ttl     = 300
  records = [aws_lb.public.dns_name]
}

# !! GAP: a public DNS record pointing straight at the database endpoint. Any
# passive-DNS or subdomain-enumeration pass finds the Postgres host, which the
# database security group then happily accepts connections to from 0.0.0.0/0.
resource "aws_route53_record" "db_public_cname" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "db.shoppal-demo.example.com"
  type    = "CNAME"
  ttl     = 300
  records = [local.db_primary_address]
}

# !! GAP: the bastion is named in public DNS as well, so "find the SSH box"
# needs no scanning at all.
resource "aws_route53_record" "bastion" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "bastion.shoppal-demo.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_instance.bastion.public_ip]
}

# An ACM certificate exists, which makes the HTTP-only ALB listener in
# compute.tf a clearer finding: TLS was available and simply not wired up.
resource "aws_acm_certificate" "shop" {
  domain_name               = "shop.shoppal-demo.example.com"
  subject_alternative_names = ["admin.shoppal-demo.example.com"]
  validation_method         = "DNS"

  tags = {
    Name     = "shop.shoppal-demo.example.com"
    Insecure = "certificate-issued-but-unused"
  }
}
