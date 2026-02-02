"""Add user name field

Revision ID: 6b7f3c8b7c12
Revises: c8a7e2b5b9d1
Create Date: 2026-02-01 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6b7f3c8b7c12"
down_revision: Union[str, Sequence[str], None] = "c8a7e2b5b9d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column("name", sa.String(), nullable=True, comment="姓名"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "name")
