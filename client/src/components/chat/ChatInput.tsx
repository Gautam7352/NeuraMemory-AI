interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (val: string) => void;
  onSubmit: () => void;
}

export const ChatInput = ({
  input,
  isLoading,
  onInputChange,
  onSubmit,
}: ChatInputProps) => (
  <div className="px-4 pt-3 pb-4 bg-neutral-950/60 backdrop-blur-md border-t border-neutral-800/60 relative z-10 shrink-0">
    <div className="flex items-end gap-2 bg-neutral-900 border border-neutral-700/80 focus-within:border-sky-500/70 rounded-2xl px-4 py-3 transition-colors duration-200">
      <textarea
        rows={1}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        disabled={isLoading}
        placeholder="Message Neura AI..."
        className="flex-1 max-h-32 min-h-[24px] bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none leading-relaxed"
      />

      {/* Send button */}
      <button
        onClick={onSubmit}
        disabled={isLoading || !input.trim()}
        title="Send"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-sky-500 text-white shadow-md transition shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
      >
        <svg
          width="15"
          height="15"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 19V5M12 5l-6 6M12 5l6 6"
          />
        </svg>
      </button>
    </div>
    <div className="text-center mt-2">
      <span className="text-[10px] text-slate-600">
        Neura AI can make mistakes. Verify important info.
      </span>
    </div>
  </div>
);
