import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Analytics } from '@vercel/analytics/react';

import Navbar from './components/Navbar';
import DashboardLayout from './components/DashboardLayout';
import ManageMemories from './components/ManageMemories';
import Login from './components/Login';
import Signup from './components/Signup';
import { api } from './lib/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'auth' | 'unauth'>(
    'loading',
  );

  useEffect(() => {
    api
      .get('/api/v1/me')
      .then(() => setStatus('auth'))
      .catch(() => setStatus('unauth'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (status === 'unauth') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/manage-memories"
        element={
          <ProtectedRoute>
            <div className="min-h-screen w-full bg-neutral-950 font-sans flex flex-col">
              <Navbar />
              <ManageMemories />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
