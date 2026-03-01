"""add_llm_model

Revision ID: 20250219_add_llm_model
Revises: 2d4c9d1f8a7b
Create Date: 2026-02-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import String, Text, Boolean, Integer


# revision identifiers, used by Alembic.
revision: str = "20250219_add_llm_model"
down_revision: Union[str, Sequence[str], None] = "2d4c9d1f8a7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 创建 llm_model 表
    op.create_table(
        "llm_model",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider", String(length=50), nullable=False, comment="供应商：deepseek / dashscope / openai_compatible"),
        sa.Column("base_url", String(length=255), nullable=False, comment="API 端点"),
        sa.Column("api_key", Text(), nullable=False, comment="密钥"),
        sa.Column("model_name", String(length=100), nullable=False, comment="显示名称（如 DeepSeek-V3）"),
        sa.Column("model_id", String(length=100), nullable=True, comment="调用标识（某些平台需要 ID 而非名称）"),
        sa.Column("use_model_id", Boolean(), nullable=False, server_default="false", comment="调用时使用 model_id 还是 model_name"),
        sa.Column("support_reasoning", Boolean(), nullable=False, server_default="false", comment="支持推理思考（思维链）"),
        sa.Column("support_image", Boolean(), nullable=False, server_default="false", comment="支持图片输入"),
        sa.Column("support_file", Boolean(), nullable=False, server_default="false", comment="支持文件输入"),
        sa.Column("support_batch", Boolean(), nullable=False, server_default="false", comment="支持批处理"),
        sa.Column("is_default", Boolean(), nullable=False, server_default="false", comment="全局唯一默认模型"),
        sa.Column("is_enabled", Boolean(), nullable=False, server_default="true", comment="是否启用"),
        sa.Column("sort_order", Integer(), nullable=False, server_default="0", comment="排序字段"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, comment="创建时间"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False, comment="更新时间"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_llm_model")),
    )

    # 创建索引
    op.create_index(op.f("ix_llm_model_provider"), "llm_model", ["provider"], unique=False)
    op.create_index(op.f("ix_llm_model_is_default"), "llm_model", ["is_default"], unique=False)
    op.create_index(op.f("ix_llm_model_is_enabled"), "llm_model", ["is_enabled"], unique=False)
    op.create_index(op.f("ix_llm_model_model_name"), "llm_model", ["model_name"], unique=False)
    op.create_index(op.f("ix_llm_model_provider_enabled"), "llm_model", ["provider", "is_enabled"], unique=False)

    # 从 config.py 读取的默认值（需要在迁移后手动更新 API Key）
    op.execute("""
        INSERT INTO llm_model (
            id, provider, base_url, api_key, model_name, model_id,
            use_model_id, support_reasoning, is_default, is_enabled, sort_order
        ) VALUES
        (
            gen_random_uuid(),
            'deepseek',
            'https://api.deepseek.com',
            'sk-69fb5637b84b4934a0c1be8e18f23643',
            'DeepSeek-V3',
            'deepseek-chat',
            true,
            false,
            true,
            true,
            0
        ),
        (
            gen_random_uuid(),
            'deepseek',
            'https://api.deepseek.com',
            'sk-69fb5637b84b4934a0c1be8e18f23643',
            'DeepSeek-Reasoner',
            'deepseek-reasoner',
            true,
            true,
            false,
            true,
            1
        );
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_llm_model_provider_enabled"), table_name="llm_model")
    op.drop_index(op.f("ix_llm_model_model_name"), table_name="llm_model")
    op.drop_index(op.f("ix_llm_model_is_enabled"), table_name="llm_model")
    op.drop_index(op.f("ix_llm_model_is_default"), table_name="llm_model")
    op.drop_index(op.f("ix_llm_model_provider"), table_name="llm_model")
    op.drop_table("llm_model")
