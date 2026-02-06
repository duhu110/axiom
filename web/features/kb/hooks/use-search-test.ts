/**
 * 检索测试钩子
 * 封装知识库检索测试功能
 */

'use client';

import { useState, useCallback } from 'react';
import { kbApi } from '../services/kb-api';
import type { SearchTestResponse, SearchResultItem } from '../types';
import { DEFAULT_SEARCH_TOP_K } from '../constants';

/**
 * 检索测试钩子
 */
export function useSearchTest(kbId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [lastQuery, setLastQuery] = useState<string>('');

  const search = useCallback(
    async (
      query: string,
      topK = DEFAULT_SEARCH_TOP_K,
      scoreThreshold?: number
    ): Promise<SearchTestResponse | null> => {
      if (!query.trim()) {
        setError(new Error('请输入查询内容'));
        return null;
      }

      setLoading(true);
      setError(null);
      setLastQuery(query);

      try {
        const response = await kbApi.searchTest(kbId, query, topK, scoreThreshold);
        setResults(response.results);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('检索失败');
        setError(error);
        setResults([]);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [kbId]
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setLastQuery('');
    setError(null);
  }, []);

  return {
    search,
    loading,
    error,
    results,
    lastQuery,
    hasResults: results.length > 0,
    clearResults,
  };
}
