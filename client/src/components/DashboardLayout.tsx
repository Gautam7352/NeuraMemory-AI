import { useState, useCallback } from 'react';
import Navbar from './Navbar';
import RightSidebar from './RightSidebar';
import MainArea from './MainArea';
import Sidebar from './Sidebar';
import { ResizeHandle } from './ResizeHandle';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 360;
const CHAT_MIN = 240;
const CHAT_MAX = 560;

export default function DashboardLayout() {
  const [sidebarW, setSidebarW] = useState(224);
  const [chatW, setChatW] = useState(320);

  const onResizeSidebar = useCallback((delta: number) => {
    setSidebarW((w) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w + delta)));
  }, []);

  const onResizeChat = useCallback((delta: number) => {
    setChatW((w) => Math.min(CHAT_MAX, Math.max(CHAT_MIN, w - delta)));
  }, []);

  return (
    <div className="flex flex-col h-screen w-full font-sans overflow-hidden" style={{ background: '#080b14' }}>
      <Navbar />
      <div className="flex flex-row w-full flex-1 overflow-hidden px-2 py-2 gap-0">
        {/* Left sidebar */}
        <div className="hidden lg:flex flex-col shrink-0 h-full py-1 pl-1" style={{ width: sidebarW }}>
          <Sidebar />
        </div>

        <ResizeHandle direction="horizontal" onResize={onResizeSidebar} />

        {/* Main area */}
        <div className="flex-1 flex flex-col h-full py-1 min-w-0 overflow-hidden rounded-2xl mx-1"
          style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <MainArea />
        </div>

        <ResizeHandle direction="horizontal" onResize={onResizeChat} />

        {/* Chat panel */}
        <div className="hidden lg:flex flex-col shrink-0 h-full py-1 pr-1" style={{ width: chatW }}>
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
