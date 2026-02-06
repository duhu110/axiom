"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import type { KBCreateRequest, KBVisibility } from "../types";

export interface KBCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: KBCreateRequest) => Promise<void>;
  loading?: boolean;
}

export default function KBCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: KBCreateDialogProps) {
  const [formData, setFormData] = useState<KBCreateRequest>({
    name: "",
    description: "",
    visibility: "private",
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      await onSubmit(formData);
      // 重置表单
      setFormData({
        name: "",
        description: "",
        visibility: "private",
      });
    } catch {
      // 错误处理由父组件负责
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="md:max-w-md">
        <DialogHeader>
          <DialogTitle>新建知识库</DialogTitle>
          <DialogDescription>
            创建一个新的知识库来管理你的文档
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="kb-name">名称 *</FieldLabel>
            <FieldContent>
              <InputGroup>
                <InputGroupInput
                  id="kb-name"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="输入知识库名称..."
                  type="text"
                  value={formData.name}
                  maxLength={100}
                  disabled={loading}
                />
              </InputGroup>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="kb-description">描述</FieldLabel>
            <FieldContent>
              <Textarea
                id="kb-description"
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="简要描述这个知识库的用途..."
                rows={3}
                value={formData.description}
                maxLength={500}
                disabled={loading}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>可见性</FieldLabel>
            <FieldContent>
              <RadioGroup
                value={formData.visibility}
                onValueChange={(value: KBVisibility) =>
                  setFormData((prev) => ({
                    ...prev,
                    visibility: value,
                  }))
                }
                disabled={loading}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="private" id="visibility-private" />
                  <Label
                    htmlFor="visibility-private"
                    className="flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-medium">私有</span>
                    <span className="text-xs text-muted-foreground">
                      仅自己可见和使用
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="public" id="visibility-public" />
                  <Label
                    htmlFor="visibility-public"
                    className="flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-medium">公开</span>
                    <span className="text-xs text-muted-foreground">
                      所有人可见（仅自己可编辑）
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </FieldContent>
          </Field>
        </div>
        <DialogFooter>
          <Button
            onClick={handleClose}
            type="button"
            variant="outline"
            disabled={loading}
          >
            取消
          </Button>
          <Button
            aria-busy={loading}
            data-loading={loading}
            disabled={!formData.name.trim() || loading}
            onClick={handleSubmit}
            type="button"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                创建中...
              </>
            ) : (
              "创建"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
