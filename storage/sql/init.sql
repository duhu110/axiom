-- =========================================================
-- Axiom 数据库初始化脚本（单 Postgres 实例，多数据库）
-- 说明：
-- 1) 该脚本会在容器首次初始化数据目录时自动执行
-- 2) 负责创建 axiom_app / axiom_kb / axiom_agent 三个数据库，并初始化所需扩展
-- 3) 设计为可重复执行（幂等）：扩展使用 IF NOT EXISTS
-- =========================================================

-- 1) 创建数据库（PostgreSQL 不支持 CREATE DATABASE IF NOT EXISTS，使用 \gexec 兼容写法）
SELECT 'CREATE DATABASE axiom_app'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'axiom_app')\gexec

SELECT 'CREATE DATABASE axiom_kb'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'axiom_kb')\gexec

SELECT 'CREATE DATABASE axiom_agent'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'axiom_agent')\gexec

-- 2) 初始化 axiom_kb（知识库数据库，需要 vector 扩展）
\connect axiom_kb

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3) 初始化 axiom_app（应用数据库，需要 pgcrypto 扩展）
\connect axiom_app

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4) 初始化 axiom_agent（Agent 数据库，需要 pgcrypto 扩展）
\connect axiom_agent

CREATE EXTENSION IF NOT EXISTS pgcrypto;