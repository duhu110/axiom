"""
LLM 模型管理脚本

功能:
1. 列出所有模型配置
2. 添加新模型配置
3. 更新现有模型配置
4. 删除模型配置
5. 设置默认模型
6. 启用/禁用模型

执行命令:
    # 列出所有模型
    uv run python scripts/llm_manager.py list

    # 添加新模型
    uv run python scripts/llm_manager.py add \
        --provider "deepseek" \
        --model-name "DeepSeek-V3" \
        --model-id "deepseek-chat" \
        --base-url "https://api.deepseek.com" \
        --api-key "sk-xxx"

    # 更新模型
    uv run python scripts/llm_manager.py update <model_id> \
        --api-key "sk-new-key"

    # 删除模型
    uv run python scripts/llm_manager.py delete <model_id>

    # 设置默认模型
    uv run python scripts/llm_manager.py set-default <model_id>

    # 启用/禁用模型
    uv run python scripts/llm_manager.py enable <model_id>
    uv run python scripts/llm_manager.py disable <model_id>
"""

import argparse
import asyncio
import sys
import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy
from sqlalchemy import select

# 添加 src 目录到 Python 路径
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from database import AsyncSessionLocal
from llm.models import LLMModel
from services.logging_service import logger


# 支持的供应商类型
PROVIDER_TYPES = ["deepseek", "dashscope", "openai_compatible"]

# 默认配置
DEFAULT_BASE_URLS = {
    "deepseek": "https://api.deepseek.com",
    "dashscope": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "openai_compatible": "https://api.openai.com/v1",
}


def format_model(model: LLMModel) -> str:
    """格式化模型信息用于显示"""
    status = "✓" if model.is_enabled else "✗"
    default = " [DEFAULT]" if model.is_default else ""
    api_key_mask = model.api_key[:8] + "..." if len(model.api_key) > 8 else "***"

    features = []
    if model.support_reasoning:
        features.append("推理")
    if model.support_image:
        features.append("图片")
    if model.support_file:
        features.append("文件")
    if model.support_batch:
        features.append("批处理")
    features_str = ", ".join(features) if features else "-"

    return f"""
ID:       {model.id}
名称:     {model.model_name} ({model.provider}){default}
状态:     {status} {'启用' if model.is_enabled else '禁用'}
API Key:  {api_key_mask}
Base URL: {model.base_url}
Model ID: {model.model_id or '(使用 model_name)'}
功能:     {features_str}
排序:     {model.sort_order}
创建时间: {model.created_at}
"""


async def list_models(args):
    """列出所有模型配置"""
    async with AsyncSessionLocal() as db:
        stmt = select(LLMModel).order_by(LLMModel.sort_order, LLMModel.model_name)
        result = await db.execute(stmt)
        models = result.scalars().all()

        if not models:
            print("没有找到任何模型配置")
            return

        print(f"\n共找到 {len(models)} 个模型配置:")
        print("=" * 60)

        for model in models:
            print(format_model(model))
            print("-" * 60)


async def add_model(args):
    """添加新模型配置"""
    async with AsyncSessionLocal() as db:
        # 验证供应商类型
        if args.provider not in PROVIDER_TYPES:
            print(f"错误: 不支持的供应商类型 '{args.provider}'")
            print(f"支持的供应商: {', '.join(PROVIDER_TYPES)}")
            return

        # 检查是否设置为默认模型
        if args.is_default:
            # 将其他模型的 is_default 设为 False
            stmt = select(LLMModel).where(LLMModel.is_default == True)
            result = await db.execute(stmt)
            existing_default = result.scalar_one_or_none()
            if existing_default:
                existing_default.is_default = False

        # 创建新模型
        model = LLMModel(
            provider=args.provider,
            model_name=args.model_name,
            model_id=args.model_id,
            base_url=args.base_url or DEFAULT_BASE_URLS.get(args.provider),
            api_key=args.api_key,
            use_model_id=args.use_model_id or False,
            support_reasoning=args.support_reasoning or False,
            support_image=args.support_image or False,
            support_file=args.support_file or False,
            support_batch=args.support_batch or False,
            is_default=args.is_default or False,
            is_enabled=True,
            sort_order=args.sort_order or 0,
        )

        db.add(model)
        await db.commit()
        await db.refresh(model)

        print(f"\n✓ 模型添加成功!")
        print(format_model(model))


async def update_model(args):
    """更新现有模型配置"""
    async with AsyncSessionLocal() as db:
        try:
            model_id = uuid.UUID(args.model_id)
        except ValueError:
            print(f"错误: 无效的模型 ID '{args.model_id}'")
            return

        stmt = select(LLMModel).where(LLMModel.id == model_id)
        result = await db.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            print(f"错误: 未找到模型 ID '{args.model_id}'")
            return

        # 更新字段
        if args.provider is not None:
            if args.provider not in PROVIDER_TYPES:
                print(f"错误: 不支持的供应商类型 '{args.provider}'")
                return
            model.provider = args.provider

        if args.model_name is not None:
            model.model_name = args.model_name

        if args.model_id is not None:
            model.model_id = args.model_id if args.model_id else None

        if args.base_url is not None:
            model.base_url = args.base_url

        if args.api_key is not None:
            model.api_key = args.api_key

        if args.use_model_id is not None:
            model.use_model_id = args.use_model_id

        if args.support_reasoning is not None:
            model.support_reasoning = args.support_reasoning

        if args.support_image is not None:
            model.support_image = args.support_image

        if args.support_file is not None:
            model.support_file = args.support_file

        if args.support_batch is not None:
            model.support_batch = args.support_batch

        if args.sort_order is not None:
            model.sort_order = args.sort_order

        model.updated_at = datetime.now()

        await db.commit()
        await db.refresh(model)

        print(f"\n✓ 模型更新成功!")
        print(format_model(model))


async def delete_model(args):
    """删除模型配置"""
    async with AsyncSessionLocal() as db:
        try:
            model_id = uuid.UUID(args.model_id)
        except ValueError:
            print(f"错误: 无效的模型 ID '{args.model_id}'")
            return

        stmt = select(LLMModel).where(LLMModel.id == model_id)
        result = await db.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            print(f"错误: 未找到模型 ID '{args.model_id}'")
            return

        if model.is_default:
            print("错误: 不能删除默认模型，请先设置其他模型为默认")
            return

        model_name = model.model_name
        await db.delete(model)
        await db.commit()

        print(f"\n✓ 模型 '{model_name}' 已删除")


async def set_default(args):
    """设置默认模型"""
    async with AsyncSessionLocal() as db:
        try:
            model_id = uuid.UUID(args.model_id)
        except ValueError:
            print(f"错误: 无效的模型 ID '{args.model_id}'")
            return

        # 查找目标模型
        stmt = select(LLMModel).where(LLMModel.id == model_id)
        result = await db.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            print(f"错误: 未找到模型 ID '{args.model_id}'")
            return

        # 取消其他模型的默认状态
        stmt_all = select(LLMModel).where(LLMModel.is_default == True)
        result_all = await db.execute(stmt_all)
        existing_defaults = result_all.scalars().all()

        for existing in existing_defaults:
            existing.is_default = False

        # 设置新的默认模型
        model.is_default = True

        await db.commit()
        await db.refresh(model)

        print(f"\n✓ 已将 '{model.model_name}' 设置为默认模型")


async def enable_model(args):
    """启用模型"""
    async with AsyncSessionLocal() as db:
        try:
            model_id = uuid.UUID(args.model_id)
        except ValueError:
            print(f"错误: 无效的模型 ID '{args.model_id}'")
            return

        stmt = select(LLMModel).where(LLMModel.id == model_id)
        result = await db.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            print(f"错误: 未找到模型 ID '{args.model_id}'")
            return

        model.is_enabled = True
        await db.commit()

        print(f"\n✓ 模型 '{model.model_name}' 已启用")


async def disable_model(args):
    """禁用模型"""
    async with AsyncSessionLocal() as db:
        try:
            model_id = uuid.UUID(args.model_id)
        except ValueError:
            print(f"错误: 无效的模型 ID '{args.model_id}'")
            return

        stmt = select(LLMModel).where(LLMModel.id == model_id)
        result = await db.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            print(f"错误: 未找到模型 ID '{args.model_id}'")
            return

        if model.is_default:
            print("错误: 不能禁用默认模型，请先设置其他模型为默认")
            return

        model.is_enabled = False
        await db.commit()

        print(f"\n✓ 模型 '{model.model_name}' 已禁用")


async def init_default_models(args):
    """初始化默认模型配置（从 config.py 读取）"""
    from config import settings

    async with AsyncSessionLocal() as db:
        # 检查是否已有模型
        stmt = select(LLMModel)
        result = await db.execute(stmt)
        existing = result.scalars().all()

        if existing:
            print(f"数据库中已有 {len(existing)} 个模型配置")
            confirm = input("是否要重新初始化默认模型？(yes/no): ")
            if confirm.lower() != "yes":
                print("取消操作")
                return

            # 删除现有模型
            for model in existing:
                await db.delete(model)
            print("已清除现有模型配置")

        # 从 config.py 读取配置
        models_to_add = [
            {
                "provider": "deepseek",
                "model_name": "DeepSeek-V3",
                "model_id": "deepseek-chat",
                "base_url": settings.agent.deepseek_base_url,
                "api_key": settings.agent.deepseek_api_key,
                "use_model_id": True,
                "support_reasoning": False,
                "is_default": True,
                "sort_order": 0,
            },
            {
                "provider": "deepseek",
                "model_name": "DeepSeek-Reasoner",
                "model_id": "deepseek-reasoner",
                "base_url": settings.agent.deepseek_base_url,
                "api_key": settings.agent.deepseek_api_key,
                "use_model_id": True,
                "support_reasoning": True,
                "is_default": False,
                "sort_order": 1,
            },
        ]

        for config in models_to_add:
            model = LLMModel(**config)
            db.add(model)

        await db.commit()

        print(f"\n✓ 已初始化 {len(models_to_add)} 个默认模型配置")

        # 列出添加的模型
        stmt = select(LLMModel).order_by(LLMModel.sort_order)
        result = await db.execute(stmt)
        models = result.scalars().all()

        for model in models:
            print(format_model(model))
            print("-" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="LLM 模型管理脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python scripts/llm_manager.py list
  python scripts/llm_manager.py add --provider deepseek --model-name "DeepSeek-V3" --api-key "sk-xxx"
  python scripts/llm_manager.py update <model_id> --api-key "sk-new-key"
  python scripts/llm_manager.py delete <model_id>
  python scripts/llm_manager.py set-default <model_id>
  python scripts/llm_manager.py enable <model_id>
  python scripts/llm_manager.py disable <model_id>
  python scripts/llm_manager.py init
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # list 命令
    list_parser = subparsers.add_parser("list", help="列出所有模型配置")

    # add 命令
    add_parser = subparsers.add_parser("add", help="添加新模型配置")
    add_parser.add_argument("--provider", required=True, choices=PROVIDER_TYPES, help="供应商类型")
    add_parser.add_argument("--model-name", required=True, help="模型显示名称")
    add_parser.add_argument("--model-id", help="模型调用标识（某些平台需要 ID 而非名称）")
    add_parser.add_argument("--base-url", help="API 端点")
    add_parser.add_argument("--api-key", required=True, help="API 密钥")
    add_parser.add_argument("--use-model-id", action="store_true", help="调用时使用 model_id 而非 model_name")
    add_parser.add_argument("--support-reasoning", action="store_true", help="支持推理思考")
    add_parser.add_argument("--support-image", action="store_true", help="支持图片输入")
    add_parser.add_argument("--support-file", action="store_true", help="支持文件输入")
    add_parser.add_argument("--support-batch", action="store_true", help="支持批处理")
    add_parser.add_argument("--is-default", action="store_true", help="设为默认模型")
    add_parser.add_argument("--sort-order", type=int, default=0, help="排序字段")

    # update 命令
    update_parser = subparsers.add_parser("update", help="更新现有模型配置")
    update_parser.add_argument("model_id", help="模型 ID")
    update_parser.add_argument("--provider", choices=PROVIDER_TYPES, help="供应商类型")
    update_parser.add_argument("--model-name", help="模型显示名称")
    update_parser.add_argument("--model-id", help="模型调用标识（设为空字符串则清空）")
    update_parser.add_argument("--base-url", help="API 端点")
    update_parser.add_argument("--api-key", help="API 密钥")
    update_parser.add_argument("--use-model-id", type=lambda x: x.lower() == 'true', help="调用时使用 model_id 而非 model_name")
    update_parser.add_argument("--support-reasoning", type=lambda x: x.lower() == 'true', help="支持推理思考")
    update_parser.add_argument("--support-image", type=lambda x: x.lower() == 'true', help="支持图片输入")
    update_parser.add_argument("--support-file", type=lambda x: x.lower() == 'true', help="支持文件输入")
    update_parser.add_argument("--support-batch", type=lambda x: x.lower() == 'true', help="支持批处理")
    update_parser.add_argument("--sort-order", type=int, help="排序字段")

    # delete 命令
    delete_parser = subparsers.add_parser("delete", help="删除模型配置")
    delete_parser.add_argument("model_id", help="模型 ID")

    # set-default 命令
    default_parser = subparsers.add_parser("set-default", help="设置默认模型")
    default_parser.add_argument("model_id", help="模型 ID")

    # enable 命令
    enable_parser = subparsers.add_parser("enable", help="启用模型")
    enable_parser.add_argument("model_id", help="模型 ID")

    # disable 命令
    disable_parser = subparsers.add_parser("disable", help="禁用模型")
    disable_parser.add_argument("model_id", help="模型 ID")

    # init 命令
    init_parser = subparsers.add_parser("init", help="初始化默认模型配置（从 config.py 读取）")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # 命令映射
    commands = {
        "list": list_models,
        "add": add_model,
        "update": update_model,
        "delete": delete_model,
        "set-default": set_default,
        "enable": enable_model,
        "disable": disable_model,
        "init": init_default_models,
    }

    try:
        asyncio.run(commands[args.command](args))
    except KeyboardInterrupt:
        print("\n操作已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
