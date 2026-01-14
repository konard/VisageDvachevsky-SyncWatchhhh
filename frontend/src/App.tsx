import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { YouTubePlayerDemo } from './components/YouTubePlayerDemo';
import { GlassDesignSystemDemo } from './components/GlassDesignSystemDemo';
import { SoundEffectsDemo } from './components/SoundEffectsDemo';
import { HomePage, RoomPage, ProfilePage } from './pages';
import { ErrorBoundary } from './components/error';
import { ToastContainer } from './components/toast';
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

function App() {
  // Preload sound effects on app initialization
  useEffect(() => {
    soundManager.preload().catch((error) => {
      console.warn('Failed to preload sounds:', error);
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
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
        </BrowserRouter>
        <ToastContainer />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
