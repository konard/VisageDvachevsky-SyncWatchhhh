import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { YouTubePlayerDemo } from './components/YouTubePlayerDemo';
import { AnimatedPage } from './components/AnimatedPage';
import { AnimatedButton } from './components/AnimatedButton';
import { fadeInUp, scaleIn } from './utils/animations';

// Placeholder pages - to be implemented
const HomePage = () => {
  const navigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <AnimatedPage className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="glass-card p-8 text-center">
        <motion.img
          src="/logo.png"
          alt="SyncWatch"
          className="w-32 h-32 mx-auto mb-6"
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5, delay: 0.2 }}
        />
        <motion.h1
          className="text-4xl font-bold text-white mb-4"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          SyncWatch
        </motion.h1>
        <motion.p
          className="text-gray-300 mb-6"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          Watch together, perfectly synchronized
        </motion.p>
        <motion.div
          className="space-y-3"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <AnimatedButton variant="glass" className="px-6 py-3 text-white font-medium w-full">
            Create Room
          </AnimatedButton>
          <AnimatedButton
            onClick={() => navigate('/youtube-demo')}
            variant="primary"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors w-full"
          >
            YouTube Player Demo
          </AnimatedButton>
        </motion.div>
      </div>
    </AnimatedPage>
  );
};

const RoomPage = () => (
  <AnimatedPage className="min-h-screen bg-slate-900 flex items-center justify-center">
    <p className="text-white">Room - Coming soon...</p>
  </AnimatedPage>
);

const LoginPage = () => (
  <AnimatedPage className="min-h-screen bg-slate-900 flex items-center justify-center">
    <p className="text-white">Login - Coming soon...</p>
  </AnimatedPage>
);

const RegisterPage = () => (
  <AnimatedPage className="min-h-screen bg-slate-900 flex items-center justify-center">
    <p className="text-white">Register - Coming soon...</p>
  </AnimatedPage>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/youtube-demo" element={<YouTubePlayerDemo />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
