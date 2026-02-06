/**
 * 文档状态轮询钩子
 * 自动轮询处理中的文档状态
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { kbApi } from '../services/kb-api';
import { useKBStore } from '../stores/kb-store';
import { POLLING_INTERVAL } from '../constants';
import type { KBDocument } from '../types';

interface UseDocumentPollingOptions {
  /** 状态变化时的回调 */
  onStatusChange?: (doc: KBDocument, previousStatus: string) => void;
  /** 是否启用轮询 */
  enabled?: boolean;
  /** 轮询间隔（毫秒） */
  interval?: number;
}

/**
 * 文档状态轮询钩子
 * @param kbId 知识库ID
 * @param documents 当前文档列表（用于检测状态变化）
 * @param refetchDocs 刷新文档列表的回调
 * @param options 配置选项
 */
export function useDocumentPolling(
  kbId: string | null,
  documents: KBDocument[],
  refetchDocs: () => void,
  options: UseDocumentPollingOptions = {}
) {
  const {
    onStatusChange,
    enabled = true,
    interval = POLLING_INTERVAL,
  } = options;

  const { pollingDocIds, addPollingDoc, removePollingDoc, clearPollingDocs } =
    useKBStore();

  // 保存上一次的文档状态映射
  const previousStatusRef = useRef<Map<string, string>>(new Map());

  // 更新状态映射
  useEffect(() => {
    const statusMap = new Map<string, string>();
    documents.forEach((doc) => {
      statusMap.set(doc.id, doc.status);
    });
    previousStatusRef.current = statusMap;
  }, [documents]);

  // 检测processing状态的文档并添加到轮询队列
  useEffect(() => {
    if (!enabled) return;

    const processingDocs = documents.filter((doc) => doc.status === 'processing');

    // 添加新的processing文档到轮询队列
    processingDocs.forEach((doc) => {
      if (!pollingDocIds.has(doc.id)) {
        addPollingDoc(doc.id);
      }
    });

    // 移除已完成的文档
    pollingDocIds.forEach((docId) => {
      const doc = documents.find((d) => d.id === docId);
      if (doc && doc.status !== 'processing') {
        removePollingDoc(docId);
      }
    });
  }, [documents, enabled, pollingDocIds, addPollingDoc, removePollingDoc]);

  // 轮询逻辑
  const poll = useCallback(async () => {
    if (!kbId || pollingDocIds.size === 0) return;

    try {
      // 获取最新的文档列表
      const response = await kbApi.listDocuments(kbId, 0, 100);
      const newDocs = response.items;

      // 检测状态变化
      newDocs.forEach((doc) => {
        const previousStatus = previousStatusRef.current.get(doc.id);

        if (previousStatus && previousStatus !== doc.status) {
          // 状态发生变化
          if (doc.status === 'indexed') {
            toast.success(`文档 "${doc.title}" 处理完成`);
            removePollingDoc(doc.id);
          } else if (doc.status === 'failed') {
            toast.error(`文档 "${doc.title}" 处理失败: ${doc.error_msg || '未知错误'}`);
            removePollingDoc(doc.id);
          }

          onStatusChange?.(doc, previousStatus);
        }
      });

      // 更新文档列表
      refetchDocs();
    } catch (error) {
      console.error('Document polling error:', error);
    }
  }, [kbId, pollingDocIds, removePollingDoc, onStatusChange, refetchDocs]);

  // 启动轮询定时器
  useEffect(() => {
    if (!enabled || !kbId || pollingDocIds.size === 0) return;

    const timer = setInterval(poll, interval);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, kbId, pollingDocIds.size, interval, poll]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearPollingDocs();
    };
  }, [clearPollingDocs]);

  return {
    /** 正在轮询的文档数量 */
    pollingCount: pollingDocIds.size,
    /** 是否正在轮询 */
    isPolling: pollingDocIds.size > 0,
    /** 手动触发轮询 */
    pollNow: poll,
    /** 手动添加文档到轮询队列 */
    addToPolling: addPollingDoc,
    /** 手动从轮询队列移除文档 */
    removeFromPolling: removePollingDoc,
  };
}
