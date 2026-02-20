// 知识库 API
import { api } from './client'

// ==================== 类型定义 ====================

export interface KnowledgeBase {
  id: string
  user_id: string
  name: string
  description?: string
  visibility: 'private' | 'public'
  embedding_model: string
  chunk_size: number
  chunk_overlap: number
  created_at: string
  updated_at: string
}

export interface KnowledgeBaseListResponse {
  items: KnowledgeBase[]
  total: number
}

export interface LLMModel {
  id: string
  name: string
  provider: string
  model_name: string
  is_enabled: boolean
  created_at: string
}

export interface LLMModelListResponse {
  items: LLMModel[]
}

// ==================== 知识库 API ====================

/**
 * 获取知识库列表
 */
export async function getKnowledgeBases(params?: {
  skip?: number
  limit?: number
}): Promise<KnowledgeBaseListResponse> {
  // 使用 POST 方法，后端是 POST /api/kb/list
  return api.post<KnowledgeBaseListResponse>('/kb/list', undefined, { params })
}

/**
 * 创建知识库
 */
export async function createKnowledgeBase(data: {
  name: string
  description?: string
  visibility?: 'private' | 'public'
}): Promise<KnowledgeBase> {
  return api.post<KnowledgeBase>('/kb/create', data)
}

/**
 * 删除知识库
 */
export async function deleteKnowledgeBase(kbId: string): Promise<{ deleted: boolean }> {
  return api.post<{ deleted: boolean }>('/kb/delete', { kb_id: kbId })
}

// ==================== 模型 API ====================

/**
 * 获取可用模型列表
 */
export async function getLLMModels(): Promise<LLMModelListResponse> {
  return api.post<LLMModelListResponse>('/llm/models', undefined)
}
