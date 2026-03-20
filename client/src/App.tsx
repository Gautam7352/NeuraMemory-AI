
import { BrowserRouter as Router, Routes, Route } from 'react-router';

import Navbar from './components/Navbar';
import DashboardLayout from './components/DashboardLayout';
import ManageMemories from './components/ManageMemories';
import Login from './components/Login';
import Signup from './components/Signup';

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/manage-memories"
        element={
          <div className="h-screen w-full bg-neutral-950 font-sans flex flex-col overflow-hidden">
            <Navbar />
            <ManageMemories />
          </div>
        }
      />
      <Route path="/" element={<DashboardLayout />} />
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
