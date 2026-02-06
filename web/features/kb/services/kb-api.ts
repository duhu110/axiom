/**
 * 知识库 API 服务层
 * 封装所有后端 API 调用
 */

import { api } from '@/lib/api/client';
import type {
  KnowledgeBase,
  KBCreateRequest,
  KBDeleteRequest,
  KBListResponse,
  DocumentUploadResponse,
  DocumentDeleteRequest,
  DocumentRetryRequest,
  DocumentListResponse,
  SearchTestRequest,
  SearchTestResponse,
  DocumentStatus,
} from '../types';

const KB_API_PREFIX = '/kb';

/**
 * 知识库 API 服务
 */
export const kbApi = {
  // ==================== 知识库管理 ====================

  /**
   * 创建知识库
   */
  async createKB(data: KBCreateRequest): Promise<KnowledgeBase> {
    return api.post<KnowledgeBase>(`${KB_API_PREFIX}/create`, data);
  },

  /**
   * 删除知识库
   */
  async deleteKB(kbId: string): Promise<{ deleted: boolean }> {
    const request: KBDeleteRequest = { kb_id: kbId };
    return api.post<{ deleted: boolean }>(`${KB_API_PREFIX}/delete`, request);
  },

  /**
   * 获取知识库列表
   */
  async listKB(skip = 0, limit = 20): Promise<KBListResponse> {
    return api.post<KBListResponse>(`${KB_API_PREFIX}/list`, undefined, {
      params: { skip, limit },
    });
  },

  /**
   * 获取单个知识库详情（从列表中获取）
   */
  async getKB(kbId: string): Promise<KnowledgeBase | null> {
    // 后端没有单独的获取接口，通过列表获取
    const response = await this.listKB(0, 100);
    return response.items.find((kb) => kb.id === kbId) || null;
  },

  // ==================== 文档管理 ====================

  /**
   * 上传文档
   * @param kbId 知识库ID
   * @param file 文件对象
   * @param title 文档标题（可选，默认使用文件名）
   */
  async uploadDocument(
    kbId: string,
    file: File,
    title?: string
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    return api.upload<DocumentUploadResponse>(
      `${KB_API_PREFIX}/${kbId}/document/upload`,
      formData
    );
  },

  /**
   * 删除文档
   */
  async deleteDocument(docId: string): Promise<{ deleted: boolean }> {
    const request: DocumentDeleteRequest = { doc_id: docId };
    return api.post<{ deleted: boolean }>(`${KB_API_PREFIX}/document/delete`, request);
  },

  /**
   * 获取文档列表
   */
  async listDocuments(
    kbId: string,
    skip = 0,
    limit = 20,
    status?: DocumentStatus
  ): Promise<DocumentListResponse> {
    const params: Record<string, string | number> = { skip, limit };
    if (status) {
      params.status = status;
    }
    return api.get<DocumentListResponse>(`${KB_API_PREFIX}/${kbId}/documents`, {
      params,
    });
  },

  /**
   * 重试失败的文档处理
   */
  async retryDocument(docId: string): Promise<{ message: string; task_id?: string }> {
    const request: DocumentRetryRequest = { doc_id: docId };
    return api.post<{ message: string; task_id?: string }>(
      `${KB_API_PREFIX}/document/retry`,
      request
    );
  },

  // ==================== 检索测试 ====================

  /**
   * 检索测试
   */
  async searchTest(
    kbId: string,
    query: string,
    topK = 4,
    scoreThreshold?: number
  ): Promise<SearchTestResponse> {
    const request: SearchTestRequest = {
      query,
      top_k: topK,
      score_threshold: scoreThreshold,
    };
    return api.post<SearchTestResponse>(`${KB_API_PREFIX}/${kbId}/search_test`, request);
  },
};

export default kbApi;
