import { NotFoundPage } from "@/components/not-found"

/**
 * 受保护路由的 404 页面
 * 当用户在受保护的路由下访问不存在的页面时会显示
 */
export default function ProtectedNotFound() {
  return <NotFoundPage />
}
