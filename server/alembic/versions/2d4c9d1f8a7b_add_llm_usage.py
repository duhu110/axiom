"""add_llm_usage

Revision ID: 2d4c9d1f8a7b
Revises: f6100f8abffa
Create Date: 2026-02-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2d4c9d1f8a7b"
down_revision: Union[str, Sequence[str], None] = "f6100f8abffa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "llm_usage",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False, comment="用户ID"),
        sa.Column("model_name", sa.String(length=100), nullable=False, comment="模型名称"),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True, comment="输入Token"),
        sa.Column("completion_tokens", sa.Integer(), nullable=True, comment="输出Token"),
        sa.Column("total_tokens", sa.Integer(), nullable=True, comment="总Token"),
        sa.Column("request_id", sa.String(length=128), nullable=True, comment="请求追踪ID"),
        sa.Column("trace_id", sa.String(length=128), nullable=True, comment="链路追踪ID"),
        sa.Column("meta", sa.JSON(), nullable=True, comment="元数据"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, comment="调用时间"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_llm_usage_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_llm_usage")),
    )
    op.create_index(op.f("ix_llm_usage_user_id"), "llm_usage", ["user_id"], unique=False)
    op.create_index(op.f("ix_llm_usage_model_name"), "llm_usage", ["model_name"], unique=False)
    op.create_index(op.f("ix_llm_usage_created_at"), "llm_usage", ["created_at"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_llm_usage_created_at"), table_name="llm_usage")
    op.drop_index(op.f("ix_llm_usage_model_name"), table_name="llm_usage")
    op.drop_index(op.f("ix_llm_usage_user_id"), table_name="llm_usage")
    op.drop_table("llm_usage")
