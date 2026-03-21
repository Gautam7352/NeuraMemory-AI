import { useToast } from '../context/ToastContext';

const STYLES = {
  success: 'bg-emerald-900/90 border-emerald-700 text-emerald-200',
  error: 'bg-red-900/90 border-red-700 text-red-200',
  info: 'bg-sky-900/90 border-sky-700 text-sky-200',
};

export function Toast() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`pointer-events-auto flex items-center gap-3 border rounded-xl px-4 py-3 text-sm shadow-lg
            animate-[slideUp_0.2s_ease-out]
            ${STYLES[toast.type]}`}
          style={{ minWidth: '260px', maxWidth: '400px' }}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            aria-label="Close"
            onClick={() => removeToast(toast.id)}
            className="shrink-0 opacity-70 hover:opacity-100 transition"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
