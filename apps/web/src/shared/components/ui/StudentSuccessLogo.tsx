import React from 'react';

interface StudentSuccessLogoProps {
  className?: string;
  size?: number;
}

/**
 * Distinguished Student Success Logo
 * Features an academic graduation mortarboard cap with a golden tassel,
 * ascending achievement beacon star, open scholarly book, and classic scholarly crest base.
 */
export function StudentSuccessLogo({ className = 'h-9 w-9', size = 36 }: StudentSuccessLogoProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="studentCapGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D061" />
          <stop offset="50%" stopColor="#B9903B" />
          <stop offset="100%" stopColor="#8A6417" />
        </linearGradient>
        <linearGradient id="studentShieldNavy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F3863" />
          <stop offset="100%" stopColor="#06192E" />
        </linearGradient>
        <linearGradient id="studentCapGlint" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5D061" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#B9903B" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Academic Shield Base */}
      <path
        d="M20 2.5 L33.5 7.5 V18 C33.5 26.5 27 34 20 37.5 C13 34 6.5 26.5 6.5 18 V7.5 L20 2.5 Z"
        fill="url(#studentShieldNavy)"
        stroke="url(#studentCapGold)"
        strokeWidth="1.75"
      />

      {/* Graduation Mortarboard Diamond Top (Academic Hat) */}
      <polygon
        points="20,9.5 31,14.5 20,19.5 9,14.5"
        fill="#06192E"
        stroke="url(#studentCapGold)"
        strokeWidth="1.6"
      />
      {/* Mortarboard Highlight Edge */}
      <polygon
        points="20,10.5 29.5,14.5 20,18.5 10.5,14.5"
        fill="none"
        stroke="#F5D061"
        strokeWidth="0.75"
        opacity="0.6"
      />

      {/* Skull Cap Base under Mortarboard Hat */}
      <path
        d="M13.5 17 V21 C13.5 23.5 16.5 25 20 25 C23.5 25 26.5 23.5 26.5 21 V17"
        fill="#06192E"
        stroke="url(#studentCapGold)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Center Button on Mortarboard Hat */}
      <circle cx="20" cy="14.5" r="1.3" fill="#F5D061" />

      {/* Hanging Golden Tassel with Brush */}
      <path
        d="M20 14.5 C23 15 28 16 29 19 V24"
        fill="none"
        stroke="#F5D061"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* Tassel Brush / Ring */}
      <ellipse cx="29" cy="24.5" rx="1.6" ry="2.2" fill="#F5D061" />

      {/* Open Scholarly Book / Diploma Crest at Base */}
      <path
        d="M14 29 C17 27.5 19 28 20 29.5 C21 28 23 27.5 26 29"
        fill="none"
        stroke="url(#studentCapGold)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M14 31.5 C17 30 19 30.5 20 32 C21 30.5 23 30 26 31.5"
        fill="none"
        stroke="#F5D061"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Ascending Beacon Achievement Star at Peak */}
      <path
        d="M20 4.5 L20.7 6.4 L22.6 6.4 L21.1 7.5 L21.7 9.4 L20 8.2 L18.3 9.4 L18.9 7.5 L17.4 6.4 L19.3 6.4 Z"
        fill="url(#studentCapGold)"
      />
    </svg>
  );
}
