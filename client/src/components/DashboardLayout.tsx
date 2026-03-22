import Navbar from './Navbar';
import RightSidebar from './RightSidebar';
import MainArea from './MainArea';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
    return (
        <div className="flex flex-col h-screen w-full bg-neutral-950 font-sans overflow-hidden">
            <Navbar />
            <div className="flex flex-row gap-4 px-2 py-2 w-full h-full flex-1 overflow-hidden items-stretch">
            <div className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 h-full">
                    <Sidebar />
                </div>
                <div className="flex-1 flex flex-col">
                    <div className="h-full bg-neutral-900/90 rounded-2xl shadow-xl p-4 flex flex-col justify-center min-w-[280px]">
                        <MainArea />
                    </div>
                </div>
                <div className="hidden lg:flex flex-col shrink-0 h-full w-[360px] max-w-[420px]">
                    <RightSidebar />
                </div>
            </div>
        </div>
    );
}
