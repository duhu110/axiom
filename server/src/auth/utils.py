import random
import re


def normalize_phone(phone: str) -> str:
    """
    规范化手机号码
    移除空格、破折号等，确保是 11 位数字
    """
    # 移除非数字字符
    phone = re.sub(r"\D", "", phone)
    
    # 简单的中国手机号校验
    if len(phone) != 11 or not phone.startswith("1"):
        raise ValueError("Invalid phone number format")
        
    return phone


def generate_otp(length: int = 6) -> str:
    """生成数字验证码"""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])
