import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlassSpinner } from './components/ui/glass';
import { ErrorBoundary } from './components/error';
import { ToastContainer } from './components/toast';
import { soundManager } from './services';
import { DiagnosticsOverlay } from './components/diagnostics';
import { useDiagnosticsKeyboard } from './hooks/useDiagnosticsKeyboard';
import { GlassColorProvider } from './contexts/GlassColorContext';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const RoomPage = lazy(() => import('./pages/RoomPage').then(module => ({ default: module.RoomPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
const YouTubePlayerDemo = lazy(() => import('./components/YouTubePlayerDemo').then(module => ({ default: module.YouTubePlayerDemo })));
const GlassDesignSystemDemo = lazy(() => import('./components/GlassDesignSystemDemo').then(module => ({ default: module.GlassDesignSystemDemo })));
const SoundEffectsDemo = lazy(() => import('./components/SoundEffectsDemo').then(module => ({ default: module.SoundEffectsDemo })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
    <GlassSpinner size="lg" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  // Enable diagnostics keyboard shortcuts (Ctrl+Shift+D)
  useDiagnosticsKeyboard();

  // Preload sound effects on app initialization
  useEffect(() => {
    soundManager.preload().catch((error) => {
      console.warn('Failed to preload sounds:', error);
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GlassColorProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/room/:code" element={<RoomPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/youtube-demo" element={<YouTubePlayerDemo />} />
                <Route path="/design-system" element={<GlassDesignSystemDemo />} />
                <Route path="/sound-demo" element={<SoundEffectsDemo />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <ToastContainer />
          <DiagnosticsOverlay />
        </GlassColorProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
