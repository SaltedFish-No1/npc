/**
 * 文件：web/src/app/App.tsx
 * 功能描述：应用根组件，提供错误边界、数据查询与路由 | Description: App root component with error boundary, React Query and routing
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 React Router、@tanstack/react-query、i18n 与样式
 */
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactLenientErrorBoundary } from '@/components/Boundaries/ReactLenientErrorBoundary';
import { Toaster } from 'sonner';
import '@/i18n';
import '@/styles/global.css';

const ChatPage = lazy(() => import('./routes/chat/ChatPage'));

const queryClient = new QueryClient();

/**
 * 功能：渲染应用根结构与路由
 * Description: Render app root structure and routes
 * @returns {JSX.Element} 根组件 | Root component
 */
export default function App() {
  return (
    <ReactLenientErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="*" element={<div style={{ padding: 24 }}>Not found</div>} />
          </Routes>
        </Suspense>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ReactLenientErrorBoundary>
  );
}
