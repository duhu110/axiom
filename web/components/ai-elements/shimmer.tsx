"use client";

import { cn } from "@/lib/utils";
import {
  type CSSProperties,
  type ElementType,
  memo,
  useMemo,
} from "react";

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  const animationName = useMemo(() => `shimmer-${duration}s`, [duration]);

  return (
    <>
      <style>{`
        @keyframes ${animationName} {
          0% {
            background-position: 100% center;
          }
          100% {
            background-position: 0% center;
          }
        }
      `}</style>
      <Component
        style={{
          animation: `${animationName} ${duration}s linear infinite`,
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        } as CSSProperties}
        className={cn(
          "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
          "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
          className
        )}
      >
        {children}
      </Component>
    </>
  );
};

export const Shimmer = memo(ShimmerComponent);
