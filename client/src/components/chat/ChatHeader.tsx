interface ChatHeaderProps {
  hasMessages: boolean;
  onClearChat: () => void;
}

export const ChatHeader = ({ hasMessages, onClearChat }: ChatHeaderProps) => (
  <div className="flex flex-col p-6 pb-2 relative z-10 shrink-0">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 shadow-md overflow-hidden">
          <svg
            width="24"
            height="24"
            viewBox="0 0 38 38"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="7"
              y="7"
              width="24"
              height="24"
              rx="6"
              fill="#18181b"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <rect
              x="13"
              y="13"
              width="12"
              height="12"
              rx="3"
              fill="#a78bfa"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <circle cx="13" cy="13" r="2" fill="#38bdf8" />
            <circle cx="25" cy="13" r="2" fill="#38bdf8" />
            <circle cx="13" cy="25" r="2" fill="#38bdf8" />
            <circle cx="25" cy="25" r="2" fill="#38bdf8" />
            <rect x="18" y="18" width="2" height="2" rx="1" fill="#fff" />
            <path
              d="M19 7V11"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M19 27V31"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M7 19H11"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M27 19H31"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">
          Neura AI
        </h2>
      </div>
      {hasMessages && (
        <button
          onClick={onClearChat}
          className="text-xs text-slate-400 hover:text-rose-400 transition-colors duration-150 cursor-pointer"
        >
          Clear chat
        </button>
      )}
    </div>
    <p className="text-xs font-medium text-slate-400">
      Ask questions about your memories
    </p>
  </div>
);
