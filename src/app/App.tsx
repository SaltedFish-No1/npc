import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactLenientErrorBoundary } from '@/components/Boundaries/ReactLenientErrorBoundary';
import { Toaster } from 'sonner';
import '@/i18n';
import '@/styles/global.css';

const ChatPage = lazy(() => import('./routes/chat/ChatPage'));

const queryClient = new QueryClient();

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
