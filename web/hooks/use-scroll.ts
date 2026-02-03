"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * 根据滚动阈值返回当前滚动状态。
 */
export function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > threshold);
  }, [threshold]);

  useEffect(() => {
    window.addEventListener("scroll", onScroll);
    const rafId = window.requestAnimationFrame(onScroll);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [onScroll]);

  return scrolled;
}
