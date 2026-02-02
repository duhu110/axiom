import { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";
import FloatingLines from "@/components/reactbits/FloatingLines";

export const metadata: Metadata = {
  title: "登录 - Axiom",
  description: "登录到您的账户",
};

export default function LoginPage() {
  return (
    // 1. 父容器设置 relative，作为定位基准
    // 增加 overflow-hidden 防止背景动画溢出导致出现滚动条
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-background p-6 md:p-10">
      {/* 2. 背景层：绝对定位撑满全屏 (inset-0)，并置于底层 (z-0) */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <FloatingLines
          linesGradient={["#E945F5", "#2F4BC0", "#E945F5"]}
          animationSpeed={2}
          interactive
          bendRadius={5}
          bendStrength={-0.5}
          mouseDamping={0.05}
          parallax
          parallaxStrength={0.2}
          mixBlendMode="normal"
        />
      </div>

      {/* 3. 内容层：相对定位，设置 z-10 确保浮在背景之上，否则无法点击输入框 */}
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
