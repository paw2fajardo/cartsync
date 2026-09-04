import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, ChevronRight, Check } from 'lucide-react';

interface SlideToConfirmProps {
  onConfirm: () => void;
  label?: string;
  confirmedLabel?: string;
  className?: string;
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  onConfirm,
  label = 'Slide to delete list',
  confirmedLabel = 'Deleted!',
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbX, setThumbX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);

  const getMaxDrag = useCallback(() => {
    if (!trackRef.current) return 0;
    const trackWidth = trackRef.current.clientWidth;
    const thumbWidth = 48; // width of thumb in px
    return Math.max(0, trackWidth - thumbWidth - 6); // 6px padding
  }, []);

  const handleStart = (clientX: number) => {
    if (isConfirmed) return;
    setIsDragging(true);
    dragStartXRef.current = clientX - thumbX;
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging || isConfirmed) return;
      const maxDrag = getMaxDrag();
      if (maxDrag <= 0) return;

      const newX = Math.min(Math.max(0, clientX - dragStartXRef.current), maxDrag);
      setThumbX(newX);
      currentXRef.current = newX;

      // Threshold: 85% of the track
      if (newX >= maxDrag * 0.85) {
        setIsDragging(false);
        setIsConfirmed(true);
        setThumbX(maxDrag);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(50);
          } catch (_) {}
        }
        setTimeout(() => {
          onConfirm();
        }, 200);
      }
    },
    [isDragging, isConfirmed, getMaxDrag, onConfirm]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging || isConfirmed) return;
    setIsDragging(false);
    const maxDrag = getMaxDrag();
    // Snap back if threshold not reached
    if (currentXRef.current < maxDrag * 0.85) {
      setThumbX(0);
      currentXRef.current = 0;
    }
  }, [isDragging, isConfirmed, getMaxDrag]);

  // Global mouse / touch move & end listeners
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  const maxDrag = getMaxDrag();
  const progress = maxDrag > 0 ? thumbX / maxDrag : 0;

  return (
    <div
      ref={trackRef}
      className={`relative h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 flex items-center p-1 select-none overflow-hidden touch-none ${className}`}
    >
      {/* Background Fill as You Slide */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-rose-500/20 dark:bg-rose-500/30 transition-none"
        style={{ width: `${Math.min(100, progress * 100 + 10)}%` }}
      />

      {/* Track Instruction Text */}
      <div
        className="w-full text-center text-xs font-bold text-rose-600 dark:text-rose-400 tracking-wide flex items-center justify-center gap-1.5 transition-opacity duration-150"
        style={{ opacity: isConfirmed ? 0 : Math.max(0, 1 - progress * 1.5) }}
      >
        <span>{label}</span>
        <ChevronRight className="w-3.5 h-3.5 animate-pulse" />
      </div>

      {/* Confirmed Text */}
      {isConfirmed && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-rose-700 dark:text-rose-300 animate-in fade-in">
          <Check className="w-4 h-4 mr-1 stroke-[3]" />
          <span>{confirmedLabel}</span>
        </div>
      )}

      {/* Draggable Slider Thumb */}
      <div
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) handleStart(e.touches[0].clientX);
        }}
        className={`absolute left-1 top-1 bottom-1 w-12 rounded-xl flex items-center justify-center text-white shadow-md cursor-grab active:cursor-grabbing transition-transform ${
          isConfirmed ? 'bg-emerald-500' : 'bg-rose-600 hover:bg-rose-700'
        } ${!isDragging ? 'transition-all duration-200 ease-out' : ''}`}
        style={{
          transform: `translateX(${thumbX}px)`,
        }}
        title="Drag right to confirm deletion"
      >
        {isConfirmed ? (
          <Check className="w-5 h-5 stroke-[2.5]" />
        ) : (
          <Trash2 className="w-5 h-5" />
        )}
      </div>
    </div>
  );
};
