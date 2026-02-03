import type React from "react";

/**
 * LogoIcon - 品牌图标部分
 * 采用三线段构成的几何 "A" 形态，具有现代感和稳定性
 */
export const LogoIcon = (props: React.ComponentProps<"svg">) => (
  <svg 
    fill="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    {/* 这里使用了 A 字的抽象变形：左斜杠、右斜杠和中间的断开式横梁 */}
    <path d="M12 2L3 22h3.5l1.8-4.5h7.4l1.8 4.5H21L12 2zm-2.5 14L12 10.2l2.5 5.8h-5z" />
    {/* 增加一个科技感的修饰元素：底部的加重横条 */}
    <rect x="8.5" y="17" width="7" height="1.5" opacity="0.8" />
  </svg>
);

/**
 * Logo - 完整的品牌标识
 * 包含图标和 AXIOM 文字排版
 */
export const Logo = (props: React.ComponentProps<"svg">) => (
  <svg
    fill="currentColor"
    viewBox="0 0 160 40"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* 引用图标部分的路径，并进行适当缩放/平移 */}
    <g transform="translate(4, 4) scale(1.3)">
       <path d="M12 2L3 22h3.5l1.8-4.5h7.4l1.8 4.5H21L12 2zm-2.5 14L12 10.2l2.5 5.8h-5z" />
    </g>

    {/* AXIOM 文本部分 */}
    <text
      x="38"
      y="22"
      fontFamily="Inter, system-ui, -apple-system, sans-serif"
      fontWeight="900"
      fontSize="24"
      letterSpacing="0.05em"
      style={{ textTransform: 'uppercase' }}
    >
      AXIOM
    </text>
    
    {/* 装饰线条，增加品牌的高级感 */}
    <rect x="38" y="26" width="90" height="1" opacity="0.2" />
  </svg>
);