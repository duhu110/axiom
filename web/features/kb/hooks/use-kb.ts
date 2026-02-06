/**
 * 知识库数据钩子
 * 封装知识库 CRUD 操作
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { kbApi } from '../services/kb-api';
import type { KnowledgeBase, KBCreateRequest, KBListResponse } from '../types';
import { DEFAULT_PAGE_SIZE } from '../constants';

/**
 * 获取知识库列表
 */
export function useKBList(initialSkip = 0, initialLimit = DEFAULT_PAGE_SIZE) {
  const [data, setData] = useState<KBListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [skip, setSkip] = useState(initialSkip);
  const [limit, setLimit] = useState(initialLimit);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await kbApi.listKB(skip, limit);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取知识库列表失败'));
    } finally {
      setLoading(false);
    }
  }, [skip, limit]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const refetch = useCallback(() => {
    fetchList();
  }, [fetchList]);

  const setPage = useCallback((newSkip: number, newLimit?: number) => {
    setSkip(newSkip);
    if (newLimit !== undefined) {
      setLimit(newLimit);
    }
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
    setPage,
  };
}

/**
 * 获取单个知识库
 */
export function useKB(kbId: string | null) {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchKB = useCallback(async () => {
    if (!kbId) {
      setKb(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await kbApi.getKB(kbId);
      setKb(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取知识库失败'));
    } finally {
      setLoading(false);
    }
  }, [kbId]);

  useEffect(() => {
    fetchKB();
  }, [fetchKB]);

  return { kb, loading, error, refetch: fetchKB };
}

/**
 * 创建知识库
 */
export function useCreateKB() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: KBCreateRequest): Promise<KnowledgeBase | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await kbApi.createKB(data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('创建知识库失败');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

/**
 * 删除知识库
 */
export function useDeleteKB() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteKB = useCallback(async (kbId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await kbApi.deleteKB(kbId);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('删除知识库失败');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteKB, loading, error };
}
