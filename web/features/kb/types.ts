/**
 * 知识库模块类型定义
 * 对齐后端 server/src/knowledgebase/schemas.py
 */

// ==================== 枚举类型 ====================

export type KBVisibility = 'private' | 'public';

export type DocumentStatus = 'processing' | 'indexed' | 'failed';

// ==================== 知识库相关 ====================

export interface KnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  visibility: KBVisibility;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  created_at: string;
  updated_at: string;
}

export interface KBCreateRequest {
  name: string;
  description?: string;
  visibility?: KBVisibility;
}

export interface KBUpdateRequest {
  name?: string;
  description?: string;
  visibility?: KBVisibility;
}

export interface KBDeleteRequest {
  kb_id: string;
}

export interface KBListResponse {
  items: KnowledgeBase[];
  total: number;
}

// ==================== 文档相关 ====================

export interface KBDocument {
  id: string;
  kb_id: string;
  title: string;
  file_key: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  error_msg?: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadResponse {
  id: string;
  title: string;
  status: DocumentStatus;
  file_type: string;
  file_size: number;
}

export interface DocumentDeleteRequest {
  doc_id: string;
}

export interface DocumentRetryRequest {
  doc_id: string;
}

export interface DocumentListResponse {
  items: KBDocument[];
  total: number;
}

// ==================== 检索相关 ====================

export interface SearchTestRequest {
  query: string;
  top_k?: number;
  score_threshold?: number;
}

export interface SearchResultItem {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface SearchTestResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
}

// ==================== API 请求参数 ====================

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface DocumentListParams extends PaginationParams {
  status?: DocumentStatus;
}
