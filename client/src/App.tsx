
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router';

import Navbar from './components/Navbar';
import MainArea from './components/MainArea';
import RightSidebar from './components/RightSidebar';
import ManageMemories from './components/ManageMemories';
import Login from './components/Login';
import Signup from './components/Signup';



function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/signup';
  // Check localStorage for user and login status
  const user = localStorage.getItem('neura_user');
  const loggedIn = localStorage.getItem('neura_logged_in');
  const navigate = window.location.pathname;

  // Redirect logic
  if (navigate === '/' || navigate === '') {
    if (!user) {
      window.location.replace('/signup');
      return null;
    } else if (!loggedIn) {
      window.location.replace('/login');
      return null;
    }
    // else show dashboard
  }

  return (
    <div className="h-screen w-full bg-neutral-950 font-sans flex flex-col overflow-hidden">
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/manage-memories"
          element={<ManageMemories />}
        />
        <Route
          path="/"
          element={
            <div className="flex flex-row gap-4 px-2 py-2 w-full h-full flex-1 overflow-hidden items-stretch">
              {/* Main Content - fills most of the width */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="h-full bg-neutral-900/90 rounded-2xl shadow-xl p-4 flex flex-col justify-center min-w-[280px]">
                  <MainArea />
                </div>
              </div>
              {/* Right Sidebar - Gemini 2.5 Pro card */}
              <div className="flex flex-col" style={{ width: '337px' }}>
                <RightSidebar />
              </div>
            </div>
          }
        />
      </Routes>
    </div>
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
