/**
 * 知识库状态管理
 * 使用 Zustand 管理 UI 状态和临时数据
 */

import { create } from 'zustand';

interface KBState {
  // 正在轮询的文档ID集合
  pollingDocIds: Set<string>;
  
  // 上传进度映射 (docId -> progress 0-100)
  uploadProgress: Map<string, number>;
  
  // Actions
  addPollingDoc: (docId: string) => void;
  removePollingDoc: (docId: string) => void;
  clearPollingDocs: () => void;
  
  setUploadProgress: (docId: string, progress: number) => void;
  removeUploadProgress: (docId: string) => void;
  clearUploadProgress: () => void;
}

export const useKBStore = create<KBState>()((set) => ({
  pollingDocIds: new Set(),
  uploadProgress: new Map(),

  addPollingDoc: (docId) =>
    set((state) => {
      const newSet = new Set(state.pollingDocIds);
      newSet.add(docId);
      return { pollingDocIds: newSet };
    }),

  removePollingDoc: (docId) =>
    set((state) => {
      const newSet = new Set(state.pollingDocIds);
      newSet.delete(docId);
      return { pollingDocIds: newSet };
    }),

  clearPollingDocs: () => set({ pollingDocIds: new Set() }),

  setUploadProgress: (docId, progress) =>
    set((state) => {
      const newMap = new Map(state.uploadProgress);
      newMap.set(docId, progress);
      return { uploadProgress: newMap };
    }),

  removeUploadProgress: (docId) =>
    set((state) => {
      const newMap = new Map(state.uploadProgress);
      newMap.delete(docId);
      return { uploadProgress: newMap };
    }),

  clearUploadProgress: () => set({ uploadProgress: new Map() }),
}));
