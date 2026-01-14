import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlassSpinner } from './components/ui/glass';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const RoomPage = lazy(() => import('./pages/RoomPage').then(module => ({ default: module.RoomPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const YouTubePlayerDemo = lazy(() => import('./components/YouTubePlayerDemo').then(module => ({ default: module.YouTubePlayerDemo })));
const GlassDesignSystemDemo = lazy(() => import('./components/GlassDesignSystemDemo').then(module => ({ default: module.GlassDesignSystemDemo })));
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { YouTubePlayerDemo } from './components/YouTubePlayerDemo';
import { GlassDesignSystemDemo } from './components/GlassDesignSystemDemo';
import { SoundEffectsDemo } from './components/SoundEffectsDemo';
import { HomePage, RoomPage, ProfilePage } from './pages';
import { soundManager } from './services';

const LoginPage = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <p className="text-white">Login - Coming soon...</p>
  </div>
);

const RegisterPage = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <p className="text-white">Register - Coming soon...</p>
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

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
    <GlassSpinner size="lg" />
  </div>
);

function App() {
  // Preload sound effects on app initialization
  useEffect(() => {
    soundManager.preload().catch((error) => {
      console.warn('Failed to preload sounds:', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
