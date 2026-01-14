import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from './pages/ProfilePage';

// Placeholder pages - to be implemented
const HomePage = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
    <div className="glass-card p-8 text-center">
      <img src="/logo.png" alt="SyncWatch" className="w-32 h-32 mx-auto mb-6" />
      <h1 className="text-4xl font-bold text-white mb-4">SyncWatch</h1>
      <p className="text-gray-300 mb-6">Watch together, perfectly synchronized</p>
      <button className="glass-button px-6 py-3 text-white font-medium">
        Create Room
      </button>
    </div>
  </div>
);

const RoomPage = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <p className="text-white">Room - Coming soon...</p>
  </div>
);

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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
