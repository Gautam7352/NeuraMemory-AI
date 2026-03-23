import { useRef, useCallback } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}

export function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const current = direction === 'horizontal' ? ev.clientX : ev.clientY;
        const delta = current - lastPos.current;
        lastPos.current = current;
        onResize(delta);
      };

      const onMouseUp = () => {
        dragging.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [direction, onResize],
  );

  if (direction === 'horizontal') {
    return (
      <div
        onMouseDown={onMouseDown}
        className="group flex items-center justify-center w-3 shrink-0 cursor-col-resize select-none"
        title="Drag to resize"
      >
        <div className="w-0.5 h-8 rounded-full bg-white/8 group-hover:bg-indigo-500/60 group-active:bg-indigo-500 transition-colors duration-150" />
      </div>
    );
  }

  return (
    <div
      onMouseDown={onMouseDown}
      className="group flex items-center justify-center h-3 shrink-0 cursor-row-resize select-none"
      title="Drag to resize"
    >
      <div className="h-0.5 w-8 rounded-full bg-white/8 group-hover:bg-indigo-500/60 group-active:bg-indigo-500 transition-colors duration-150" />
    </div>
  );
}
