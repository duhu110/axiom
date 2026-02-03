"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "../hooks/use-auth";
import { sendSmsAction } from "../server/actions";
import {
  GalleryVerticalEnd,
  Loader2,
  ArrowLeft,
  Smartphone,
  Bug,
} from "lucide-react";
import { toast } from "sonner";

// 检查是否使用 Mock 认证 (环境变量控制)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  useSearchParams();
  const { login } = useAuth(); // 使用 useAuth 中的 login

  const [step, setStep] = React.useState<"phone" | "otp">("phone");
  const [phone, setPhone] = React.useState("");
  const [otpValue, setOtpValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);

  // 倒计时逻辑
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const validatePhone = (value: string) => {
    const reg = /^1[3-9]\d{9}$/;
    return reg.test(value);
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!phone) {
      toast.error("请输入手机号码");
      return;
    }

    if (!validatePhone(phone)) {
      toast.error("手机号码格式错误", {
        description: "请输入有效的 11 位中国大陆手机号",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendSmsAction(phone);

      if (result.success) {
        toast.success("验证码已发送", {
          description: `验证码已发送至 +86 ${phone}，请注意查收`,
        });
        setStep("otp");
        setOtpValue(""); // 清空 OTP 输入
        setCountdown(60);
      } else {
        toast.error(result.error || "发送失败");
      }
    } catch (error) {
      toast.error("发送验证码失败");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpValue.length !== 6) {
      toast.error("请输入完整的验证码");
      return;
    }

    setIsLoading(true);

    try {
      // 使用 useAuth 的 login 方法，它会处理 token 保存、用户信息获取和跳转
      await login({ phone, code: otpValue });
    } catch {
      // useAuth 已处理 toast error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 1. 强制 text-white，确保全局文字在黑底上可见
    <div
      className={cn(
        "flex flex-col gap-8 max-w-sm mx-auto text-white",
        className,
      )}
      {...props}
    >
      {/* 开发模式提示 */}
      {USE_MOCK && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm">
          <Bug className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">开发模式</p>
            <p className="text-xs opacity-80">
              验证码: 任意6位数字 (如 123456)
            </p>
          </div>
        </div>
      )}

      {/* 头部区域 */}
      <div className="flex flex-col items-center gap-6 text-center pt-8">
        {/* 图标背景改为半透明白 */}
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white shadow-xl backdrop-blur-sm">
          <GalleryVerticalEnd className="size-8" />
        </div>
        <div className="space-y-1">
          {/* 副标题颜色调整为浅灰 (white/70) */}
          <h2 className="text-lg font-medium text-white/70 tracking-wide">
            青海都护网络科技有限公司
          </h2>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            AI智能体平台
          </h1>
        </div>
      </div>

      <div className="grid gap-0">
        <div className="h-[140px] flex flex-col justify-end pb-4 relative">
          {/* 步骤 1: 手机号输入 */}
          {step === "phone" && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
              <Label
                htmlFor="phone"
                className="text-base font-medium ml-1 text-white"
              >
                手机号码
              </Label>
              <div className="relative group">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 group-focus-within:text-white transition-colors" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号码"
                  // 2. Input 样式大改：
                  // bg-white/5: 极淡的白色背景
                  // border-white/10: 淡白色边框
                  // text-white: 输入文字纯白
                  // placeholder:text-white/40: 占位符半透明
                  className={cn(
                    "pl-12 h-14 text-lg bg-white/5 border-white/10 text-white shadow-sm transition-all placeholder:text-white/40",
                    "focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:border-white/50",
                  )}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setPhone(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendCode();
                  }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* 步骤 2: OTP 输入 */}
          {step === "otp" && (
            <div className="flex justify-center animate-in fade-in slide-in-from-right-4 duration-300">
              <InputOTP
                maxLength={6}
                autoFocus
                value={otpValue}
                onChange={(value) => setOtpValue(value)}
                onComplete={(value) => {
                  // OTP 输入完毕，可选自动提交
                  if (value.length === 6 && !isLoading) {
                    handleLogin(
                      new Event("submit") as unknown as React.FormEvent,
                    );
                  }
                }}
              >
                <InputOTPGroup className="gap-3">
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      // 3. OTP 样式大改，与 Input 保持一致的磨砂感
                      className="h-16 w-12 text-2xl text-white border-2 border-white/10 rounded-lg bg-white/5 shadow-sm first:rounded-l-lg last:rounded-r-lg focus:scale-105 focus:border-white/50 transition-all"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          )}
        </div>

        {/* 按钮区域 */}
        <div className="grid gap-4">
          <Button
            onClick={step === "phone" ? handleSendCode : handleLogin}
            size="lg"
            // 4. 按钮改为纯白背景黑字，在黑底上最突出 (Atmospheric)
            className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-white/90 shadow-lg shadow-white/5 transition-all active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                请稍候...
              </>
            ) : step === "phone" ? (
              "获取验证码"
            ) : (
              "立即登录"
            )}
          </Button>

          {/* 底部辅助链接 */}
          <div className="h-6 flex items-center justify-between text-sm px-1">
            {step === "otp" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  // 链接颜色改为 white/60 -> white
                  className="flex items-center text-white/60 hover:text-white transition-colors animate-in fade-in"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  返回修改
                </button>

                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={(e) => handleSendCode(e)}
                  className={cn(
                    "font-medium transition-colors animate-in fade-in",
                    // 倒计时颜色逻辑调整
                    countdown > 0
                      ? "text-white/40 cursor-not-allowed"
                      : "text-white hover:underline",
                  )}
                >
                  {countdown > 0 ? `${countdown}秒后重新发送` : "重新发送"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 底部 LOGO */}
      <div className="mt-8 flex flex-col items-center gap-4 opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-white/60 font-medium tracking-widest uppercase">
          Powered By
        </span>
        {/* 5. 关键：加上 invert 类，把黑色 Logo 翻转成白色，同时保持 grayscale */}
        <Image
          src="/globe.svg"
          alt="Logo"
          width={90}
          height={90}
          className="h-7 w-auto grayscale invert brightness-200"
        />
      </div>
    </div>
  );
}
