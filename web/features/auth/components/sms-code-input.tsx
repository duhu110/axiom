"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { sendSmsAction } from "../server/actions"
import { cn } from "@/lib/utils"

interface SmsCodeInputProps extends React.ComponentProps<typeof Input> {
  phone: string;
  onSend?: () => void;
}

export const SmsCodeInput = React.forwardRef<HTMLInputElement, SmsCodeInputProps>(
  ({ className, phone, onSend, ...props }, ref) => {
    const [countdown, setCountdown] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      }
    }, [countdown]);

    const handleSend = async (e: React.MouseEvent) => {
      e.preventDefault();
      
      if (!phone || phone.length !== 11) {
        toast.error("请输入正确的手机号");
        return;
      }

      setIsLoading(true);
      try {
        const result = await sendSmsAction(phone);
        if (result.success) {
          toast.success("验证码已发送");
          setCountdown(60);
          onSend?.();
        } else {
          toast.error(result.error || "发送失败");
        }
      } catch {
        toast.error("发送失败，请稍后重试");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="relative">
        <Input ref={ref} className={cn("pr-24", className)} {...props} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent"
          onClick={handleSend}
          disabled={countdown > 0 || isLoading || !phone}
        >
          {isLoading ? "发送中..." : countdown > 0 ? `${countdown}s` : "获取验证码"}
        </Button>
      </div>
    );
  }
);
SmsCodeInput.displayName = "SmsCodeInput"
