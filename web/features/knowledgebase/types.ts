import type { ReactNode } from "react";

// HEADER 链接
export type NavLink = {
  label: string;
  href: string;
};

// HEADER 前面的属性
export type HeaderProps = {
  leading?: ReactNode;
};

export type FeatureType = {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
};