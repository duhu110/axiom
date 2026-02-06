"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  ACCEPTED_FILE_EXTENSIONS,
  validateFile,
  formatFileSize,
  getFileTypeLabel,
} from "../constants";

export interface DocumentUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  uploading?: boolean;
  uploadingFiles?: string[];
  className?: string;
  disabled?: boolean;
}

interface PendingFile {
  file: File;
  error?: string;
}

export default function DocumentUpload({
  onUpload,
  uploading = false,
  uploadingFiles = [],
  className,
  disabled = false,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((files: File[]) => {
    const newPendingFiles: PendingFile[] = files.map((file) => {
      const validation = validateFile(file);
      return {
        file,
        error: validation.valid ? undefined : validation.error,
      };
    });

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || uploading) return;

      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    },
    [disabled, uploading, processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || uploading) return;

      const files = Array.from(e.target.files || []);
      processFiles(files);

      // 重置 input 以允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [disabled, uploading, processFiles]
  );

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const validFiles = pendingFiles
      .filter((pf) => !pf.error)
      .map((pf) => pf.file);

    if (validFiles.length === 0) return;

    try {
      await onUpload(validFiles);
      // 上传成功后清空待上传列表
      setPendingFiles([]);
    } catch {
      // 错误处理由父组件负责
    }
  };

  const hasValidFiles = pendingFiles.some((pf) => !pf.error);
  const isDisabled = disabled || uploading;

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        {/* 拖拽上传区域 */}
        <div
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            isDisabled && "cursor-not-allowed opacity-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isDisabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_EXTENSIONS}
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isDisabled}
          />

          <Upload
            className={cn(
              "mb-4 size-10",
              isDragging ? "text-primary" : "text-muted-foreground"
            )}
          />
          <p className="mb-2 text-sm font-medium">
            {isDragging ? "释放以上传文件" : "拖拽文件到此处或点击选择"}
          </p>
          <p className="text-xs text-muted-foreground">
            支持 PDF、TXT、Markdown、Word 文件，单个文件最大 50MB
          </p>
        </div>

        {/* 待上传文件列表 */}
        {pendingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">待上传文件</h4>
              <span className="text-xs text-muted-foreground">
                {pendingFiles.filter((pf) => !pf.error).length} 个有效文件
              </span>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {pendingFiles.map((pf, index) => (
                <div
                  key={`${pf.file.name}-${index}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3",
                    pf.error
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border"
                  )}
                >
                  <FileText
                    className={cn(
                      "size-5 shrink-0",
                      pf.error ? "text-destructive" : "text-muted-foreground"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {pf.file.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getFileTypeLabel(pf.file.name.split(".").pop() || "")}</span>
                      <span>-</span>
                      <span>{formatFileSize(pf.file.size)}</span>
                    </div>
                    {pf.error && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="size-3" />
                        {pf.error}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    disabled={uploading}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 正在上传的文件 */}
        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">正在上传</h4>
            {uploadingFiles.map((name, index) => (
              <div
                key={`uploading-${name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/5 p-3"
              >
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
                <p className="truncate text-sm font-medium">{name}</p>
              </div>
            ))}
          </div>
        )}

        {/* 上传按钮 */}
        {pendingFiles.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={!hasValidFiles || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  上传 {pendingFiles.filter((pf) => !pf.error).length} 个文件
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
