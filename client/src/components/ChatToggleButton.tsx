import { useState, useRef, useEffect } from 'react';

interface ChatToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const STORAGE_KEY = 'neura-chat-btn-pos';

function ChatToggleButton({ isOpen, onToggle }: ChatToggleButtonProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Drag state stored in refs to avoid re-renders during drag
  const dragRef = useRef<{
    startX: number;
    startY: number;
    isDragging: boolean;
    currentX: number;
    currentY: number;
  }>({ startX: 0, startY: 0, isDragging: false, currentX: 0, currentY: 0 });

  // Restore position from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      isDragging: true,
      currentX: e.clientX,
      currentY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.currentX = e.clientX;
    dragRef.current.currentY = e.clientY;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= 5) {
      // Reposition: use pointer position as center of button
      const newPos = { x: e.clientX - 28, y: e.clientY - 28 };
      setPosition(newPos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      // Treat as tap
      onToggle();
    } else {
      // Persist new position
      const newPos = { x: e.clientX - 28, y: e.clientY - 28 };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));
      } catch {
        // ignore storage errors
      }
    }
  };

  // Determine positioning classes / style
  const hasCustomPosition = position !== null;

  const defaultPositionClass = isOpen
    ? 'fixed top-4 left-1/2 -translate-x-1/2'
    : 'fixed bottom-6 right-6';

  const positionStyle = hasCustomPosition
    ? { left: position.x, top: position.y }
    : undefined;

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`lg:hidden fixed z-50 flex items-center gap-2 rounded-full shadow-lg px-4 py-3 bg-gradient-to-br from-violet-500 to-sky-500 text-white select-none touch-none ${hasCustomPosition ? '' : defaultPositionClass}`}
      style={positionStyle}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? (
        <>
          {/* X icon */}
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          <span className="text-sm font-semibold">Close</span>
        </>
      ) : (
        /* Chat bubble icon */
        <svg
          width="22"
          height="22"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      )}
    </button>
  );
}

export default ChatToggleButton;
