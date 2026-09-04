import React from 'react';

interface CartSyncLogoProps {
  className?: string;
  size?: number;
}

export const CartSyncLogo: React.FC<CartSyncLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-xs ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="headerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        {/* Background Tile */}
        <rect width="32" height="32" rx="7.5" fill="url(#headerLogoGrad)" />

        {/* Sleek Cart Contour */}
        <path
          d="M7 9H9.8L12.5 19H22.5L25 12H11"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Sync Checkmark */}
        <path
          d="M14.5 14.5L16.5 16.5L20.5 12.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dynamic Wheels */}
        <circle cx="13.5" cy="23.5" r="1.75" fill="white" />
        <circle cx="21.5" cy="23.5" r="1.75" fill="white" />
      </svg>
    </div>
  );
};
