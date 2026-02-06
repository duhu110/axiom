/**
 * 知识库模块常量定义
 */

// 支持的文件类型映射
export const SUPPORTED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// 文件扩展名到MIME类型映射
export const FILE_EXTENSION_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// 接受的文件扩展名
export const ACCEPTED_FILE_EXTENSIONS = '.pdf,.txt,.md,.docx';

// 最大文件大小: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 轮询间隔: 5秒
export const POLLING_INTERVAL = 5000;

// 默认分页大小
export const DEFAULT_PAGE_SIZE = 20;

// 最大分页大小
export const MAX_PAGE_SIZE = 100;

// 检索测试默认参数
export const DEFAULT_SEARCH_TOP_K = 4;
export const MAX_SEARCH_TOP_K = 20;

/**
 * 验证文件是否支持
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // 检查文件类型
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  
  // 通过MIME类型或扩展名验证
  const isSupportedByMime = mimeType in SUPPORTED_FILE_TYPES;
  const isSupportedByExt = extension in FILE_EXTENSION_TO_MIME;
  
  if (!isSupportedByMime && !isSupportedByExt) {
    return { 
      valid: false, 
      error: '不支持的文件类型，请上传 PDF、TXT、MD 或 DOCX 文件' 
    };
  }
  
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `文件大小超过 ${MAX_FILE_SIZE / 1024 / 1024}MB 限制` 
    };
  }
  
  // 检查文件是否为空
  if (file.size === 0) {
    return { 
      valid: false, 
      error: '文件内容为空' 
    };
  }
  
  return { valid: true };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件类型显示名称
 */
export function getFileTypeLabel(fileType: string): string {
  const labels: Record<string, string> = {
    'pdf': 'PDF',
    'txt': 'TXT',
    'md': 'Markdown',
    'docx': 'Word',
  };
  return labels[fileType.toLowerCase()] || fileType.toUpperCase();
}

/**
 * 获取状态显示配置
 */
export function getStatusConfig(status: string): { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
} {
  switch (status) {
    case 'processing':
      return { 
        label: '处理中', 
        variant: 'secondary',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      };
    case 'indexed':
      return { 
        label: '已完成', 
        variant: 'default',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      };
    case 'failed':
      return { 
        label: '失败', 
        variant: 'destructive',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      };
    default:
      return { 
        label: status, 
        variant: 'outline',
        className: ''
      };
  }
}
