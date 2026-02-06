/**
 * 文档上传钩子
 * 封装文件上传逻辑
 */

'use client';

import { useState, useCallback } from 'react';
import { kbApi } from '../services/kb-api';
import { useKBStore } from '../stores/kb-store';
import { validateFile } from '../constants';
import type { DocumentUploadResponse } from '../types';

export interface UploadResult {
  success: boolean;
  document?: DocumentUploadResponse;
  error?: string;
  file: File;
}

/**
 * 文档上传钩子
 */
export function useDocumentUpload(kbId: string) {
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const { addPollingDoc } = useKBStore();

  /**
   * 上传单个文件
   */
  const uploadFile = useCallback(
    async (file: File, title?: string): Promise<UploadResult> => {
      // 验证文件
      const validation = validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          file,
        };
      }

      try {
        const response = await kbApi.uploadDocument(kbId, file, title);
        
        // 上传成功后，将文档添加到轮询队列
        if (response.status === 'processing') {
          addPollingDoc(response.id);
        }
        
        return {
          success: true,
          document: response,
          file,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '上传失败';
        return {
          success: false,
          error: errorMessage,
          file,
        };
      }
    },
    [kbId, addPollingDoc]
  );

  /**
   * 上传多个文件
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      if (files.length === 0) return [];

      setUploading(true);
      setError(null);
      setUploadingFiles(files.map((f) => f.name));

      const results: UploadResult[] = [];

      try {
        // 依次上传文件
        for (const file of files) {
          const result = await uploadFile(file);
          results.push(result);
          
          // 更新正在上传的文件列表
          setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('上传失败'));
      } finally {
        setUploading(false);
        setUploadingFiles([]);
      }

      return results;
    },
    [uploadFile]
  );

  /**
   * 上传单个文件（简化版）
   */
  const upload = useCallback(
    async (file: File, title?: string): Promise<DocumentUploadResponse | null> => {
      setUploading(true);
      setError(null);
      setUploadingFiles([file.name]);

      try {
        // 验证文件
        const validation = validateFile(file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const response = await kbApi.uploadDocument(kbId, file, title);
        
        // 上传成功后，将文档添加到轮询队列
        if (response.status === 'processing') {
          addPollingDoc(response.id);
        }
        
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('上传失败');
        setError(error);
        throw error;
      } finally {
        setUploading(false);
        setUploadingFiles([]);
      }
    },
    [kbId, addPollingDoc]
  );

  return {
    upload,
    uploadFile,
    uploadFiles,
    uploading,
    uploadingFiles,
    error,
  };
}
