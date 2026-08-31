"""Compatibility shims applied to the moto emulator before it serves traffic.

Each patch here works around a specific, verified upstream limitation that
would otherwise stop `terraform apply` from completing. They are deliberately
narrow: if moto fixes one, deleting the corresponding function is the whole
migration.

Imported by fakecloud_server.py; not used anywhere else.
"""

import random
import string


def patch_unique_dbi_resource_id() -> str:
    """Give every RDS instance a distinct DbiResourceId.

    moto (through 5.2.x) assigns the same literal to every DB instance:

        moto/rds/models.py:  self.dbi_resource_id = "db-M5ENSHXFPU6XHZ4G4ZEI5QIO2U"

    The Terraform AWS provider uses DbiResourceId as the resource's Terraform
    ID and reads the instance back through a `dbi-resource-id` filter. With a
    shared value, that filter matches every instance at once, the provider
    can't resolve exactly one, and the post-create read fails with
    "couldn't find resource" - so a config with more than one aws_db_instance
    can never apply cleanly.

    Assigning a unique, correctly-shaped ID per instance is what real RDS
    does and is enough to make multi-instance configs work.
    """
    from moto.rds import models as rds_models

    original_init = rds_models.DBInstance.__init__

    def patched_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        alphabet = string.ascii_uppercase + string.digits
        self.dbi_resource_id = "db-" + "".join(random.choices(alphabet, k=26))

    rds_models.DBInstance.__init__ = patched_init
    return "rds: unique DbiResourceId per DB instance"


def patch_list_service_specific_credentials() -> str:
    """Implement the IAM ListServiceSpecificCredentials action as an empty list.

    moto does not implement this action and answers with a 500:

        NotImplementedError: The list_service_specific_credentials action has
        not been implemented

    The Terraform AWS provider calls it while tearing down an `aws_iam_user`
    that has `force_destroy = true`, and treats the 500 as retryable - so a
    destroy hangs for over twenty minutes before timing out.

    The estate no longer sets `force_destroy` (every child resource is managed
    by Terraform and destroyed first, so it was never needed), which avoids the
    call entirely. This stays as a safety net for anyone who adds it back, or
    for a scanner that calls the action while enumerating credentials. Real IAM
    returns an empty list for users with no service-specific credentials, and
    nothing here ever creates any.
    """
    from moto.iam.responses import IamResponse

    template = (
        '<ListServiceSpecificCredentialsResponse '
        'xmlns="https://iam.amazonaws.com/doc/2010-05-08/">'
        "<ListServiceSpecificCredentialsResult>"
        "<ServiceSpecificCredentials />"
        "</ListServiceSpecificCredentialsResult>"
        "<ResponseMetadata>"
        "<RequestId>fakecloud-list-ssc</RequestId>"
        "</ResponseMetadata>"
        "</ListServiceSpecificCredentialsResponse>"
    )

    def list_service_specific_credentials(self) -> str:
        return template

    IamResponse.list_service_specific_credentials = list_service_specific_credentials
    return "iam: ListServiceSpecificCredentials returns an empty list"


ALL_PATCHES = (
    patch_unique_dbi_resource_id,
    patch_list_service_specific_credentials,
)


def apply_all() -> list:
    """Apply every patch, returning a human-readable list of what was changed."""
    return [patch() for patch in ALL_PATCHES]
