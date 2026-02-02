# server
    1 项目配置直接写到 server\src\config.py 不再使用环境变量
    2 UV 环境管理，虚拟环境在server\.venv 
    3 pytest 测试框架 server\tests 中按模块管理测试文件
    4 alembic 管理数据库迁移
    5 参照 server\src\services\logging_service.py 配置重要内容的日志
    6 全部POST接口 server\src\response.py server\src\exceptions.py 管理返回,为每个接口配备完整的SCALAR文档设置，包括接口输入输出