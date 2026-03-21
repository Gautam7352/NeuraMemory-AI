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

  if (status === 'loading') return null;
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
            <div className="h-screen w-full bg-neutral-950 font-sans flex flex-col overflow-hidden">
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
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
