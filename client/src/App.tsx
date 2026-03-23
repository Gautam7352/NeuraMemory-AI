import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';

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

  if (status === 'loading')
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#080b14' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <svg className="animate-spin" width="20" height="20" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
            <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      </div>
    );
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
            <div className="min-h-screen w-full font-sans flex flex-col" style={{ background: '#080b14' }}>
              <Navbar />
              <div className="flex-1 overflow-y-auto">
                <ManageMemories />
              </div>
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
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
