# RustFS 模块设计方案 (已落地)

## 现状概览
- 路由：`/files/upload`、`/files/download/{file_id}` (POST)、`/files/{file_id}` (POST 删除)
- 存储：单一 bucket（`settings.storage.bucket_name`），对象 key 使用结构化路径
- 鉴权：
  - 上传/删除：必须登录
  - 下载：必须鉴权（Header Bearer Token），不支持匿名下载

## 核心设计落地

### 1. 数据模型 (`file_objects`)
| 字段 | 类型 | 说明 |
|Data Type|Type|Description|
|---|---|---|
| `id` | UUID | 主键，对外暴露的 file_id |
| `module` | String | 业务模块 (e.g., "auth") |
| `resource` | String | 资源类型 (e.g., "avatar") |
| `object_key` | String | MinIO 中的实际路径 (Unique) |
| `owner_id` | UUID | 上传者 ID |
| `filename` | String | 原始文件名 |
| `size` | BigInteger | 文件大小 |
| `content_type` | String | MIME 类型 |
| `etag` | String | ETag |
| `visibility` | Enum | `private` (仅拥有者), `public` (所有人) |
| `related_type` | String | (可选) 关联业务类型 |
| `related_id` | String | (可选) 关联业务ID |
| `created_at` | DateTime | 创建时间 |

### 2. 对象 Key 组织规范
格式：`{module}/{resource}/{yyyy}/{mm}/{owner_id}/{uuid}_{origin_name}`
示例：`auth/avatar/2026/02/<user_id>/<uuid>_avatar.png`

### 3. 接口规范

#### 上传文件
`POST /files/upload`
- **Header**: `Authorization: Bearer <token>`
- **Form Data**:
  - `file`: 文件内容
  - `module`: 业务模块
  - `resource`: 资源类型
  - `visibility`: `private` | `public` (default: private)
  - `related_type`: (optional)
  - `related_id`: (optional)
- **Response**:
  ```json
  {
    "code": 0,
    "msg": "success",
    "data": {
      "file_id": "uuid...",
      "object_key": "path/to/file..."
    }
  }
  ```

#### 下载文件
`POST /files/download/{file_id}`
- **Header**: `Authorization: Bearer <token>` (**强制**)
- **Response**: 二进制流 (Stream)

#### 删除文件
`POST /files/{file_id}`
- **Header**: `Authorization: Bearer <token>`
- **Logic**: 仅 Owner 可删除。同时删除数据库记录和 MinIO 对象。

### 4. 代码结构
- `server/src/rustfs/models.py`: 数据库模型
- `server/src/rustfs/schemas.py`: Pydantic 校验
- `server/src/rustfs/service.py`: 业务逻辑 (DB + MinIO 操作)
- `server/src/rustfs/client.py`: MinIO 底层封装
- `server/src/rustfs/router.py`: 路由定义

### 5. 权限策略
- **下载/删除**: 必须提供有效 Token，且对于 Private 文件仅 Owner 可操作。
- **关联业务权限**: (TODO) 未来可基于 `related_type` + `related_id` 扩展更复杂的业务权限校验。

## 后续规划
- [ ] 增加图片处理（缩略图）支持
- [ ] 支持分片上传（大文件）
- [ ] 定时清理无引用的临时文件
