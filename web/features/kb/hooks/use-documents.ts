/**
 * 文档数据钩子
 * 封装文档 CRUD 操作
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { kbApi } from '../services/kb-api';
import type { DocumentListResponse, DocumentStatus } from '../types';
import { DEFAULT_PAGE_SIZE } from '../constants';

/**
 * 获取文档列表
 */
export function useDocuments(
  kbId: string | null,
  initialSkip = 0,
  initialLimit = DEFAULT_PAGE_SIZE,
  statusFilter?: DocumentStatus
) {
  const [data, setData] = useState<DocumentListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [skip, setSkip] = useState(initialSkip);
  const [limit, setLimit] = useState(initialLimit);
  const [status, setStatus] = useState<DocumentStatus | undefined>(statusFilter);

  const fetchDocuments = useCallback(async () => {
    if (!kbId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await kbApi.listDocuments(kbId, skip, limit, status);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取文档列表失败'));
    } finally {
      setLoading(false);
    }
  }, [kbId, skip, limit, status]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const refetch = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const setPage = useCallback((newSkip: number, newLimit?: number) => {
    setSkip(newSkip);
    if (newLimit !== undefined) {
      setLimit(newLimit);
    }
  }, []);

  const setStatusFilter = useCallback((newStatus?: DocumentStatus) => {
    setStatus(newStatus);
    setSkip(0); // 切换状态过滤时重置分页
  }, []);

  return {
    data,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    refetch,
    skip,
    limit,
    status,
    setPage,
    setStatusFilter,
  };
}

/**
 * 删除文档
 */
export function useDeleteDocument() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteDocument = useCallback(async (docId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await kbApi.deleteDocument(docId);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('删除文档失败');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteDocument, loading, error };
}

/**
 * 重试失败的文档处理
 */
export function useRetryDocument() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const retryDocument = useCallback(async (docId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await kbApi.retryDocument(docId);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('重试文档处理失败');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { retryDocument, loading, error };
}

/**
 * 获取处理中的文档（用于轮询）
 */
export function useProcessingDocuments(kbId: string | null) {
  const { items, loading, error, refetch } = useDocuments(kbId, 0, 100, 'processing');

  return {
    processingDocs: items,
    loading,
    error,
    refetch,
  };
}
