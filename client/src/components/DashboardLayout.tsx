import { useState } from 'react';
import Navbar from './Navbar';
import RightSidebar from './RightSidebar';
import MainArea from './MainArea';
import ChatToggleButton from './ChatToggleButton';

export default function DashboardLayout() {
  const [showAI, setShowAI] = useState(false);

  return (
    <div className="flex flex-col h-screen w-full bg-neutral-950 font-sans overflow-hidden">
      <Navbar />

      <div className="flex flex-row gap-4 px-0 py-0 lg:px-2 lg:py-2 w-full flex-1 overflow-hidden items-stretch">
        {/* Main content — hidden on mobile when AI panel is open */}
        <div
          className={`flex-1 flex-col justify-center min-w-0 ${showAI ? 'hidden' : 'flex'} lg:flex`}
        >
          <div className="h-full bg-neutral-900/90 rounded-2xl shadow-xl p-4 flex flex-col justify-center overflow-y-auto">
            <MainArea />
          </div>
        </div>

        {/* Right sidebar — always visible on lg+, toggled on mobile */}
        <div
          className={`flex-col shrink-0 lg:h-full w-full lg:w-[360px] lg:max-w-[420px] ${showAI ? 'flex flex-1' : 'hidden'} lg:flex`}
        >
          <RightSidebar />
        </div>
      </div>

      <ChatToggleButton isOpen={showAI} onToggle={() => setShowAI((v) => !v)} />
    </div>
  );
}
