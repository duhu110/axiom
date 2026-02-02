"""
开发测试用 - 快速获取用户 Token

用法:
    cd D:\project\FullStack\axiom\server\src
    python ..\scripts\get_token.py [phone]
    
默认手机号: 18997485868
"""

import sys
import os
import asyncio

# 添加 src 目录到 Python 路径
src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, src_dir)

from sqlalchemy import select
from database import async_engine, AsyncSession
from auth.models import User
from auth.security import create_access_token, create_refresh_token


async def get_token(phone: str) -> None:
    """获取指定手机号用户的 Token"""
    async with AsyncSession(async_engine) as session:
        result = await session.execute(
            select(User).where(User.phone == phone)
        )
        user = result.scalars().first()
        
        if not user:
            print(f"用户不存在: {phone}")
            return
        
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        
        print(f"\n用户: {user.phone} (ID: {user.id})")
        print(f"\nAccess Token:\n{access_token}")
        print(f"\nRefresh Token:\n{refresh_token}")
        print(f"\n使用方式:")
        print(f'Authorization: Bearer {access_token}')


if __name__ == "__main__":
    phone = sys.argv[1] if len(sys.argv) > 1 else "18997485868"
    asyncio.run(get_token(phone))
