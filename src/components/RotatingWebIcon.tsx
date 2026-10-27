import React from 'react';

interface RotatingWebIconProps {
  size?: number | string;
  className?: string;
  color?: string;
}

export const RotatingWebIcon: React.FC<RotatingWebIconProps> = ({
  size = 18,
  className = '',
  color = 'currentColor'
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        perspective: '400px'
      }}
      title="Web Search Index Active"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full overflow-visible"
        style={{
          transformOrigin: 'center'
        }}
      >
        <defs>
          <clipPath id="webGlobeClip">
            <circle cx="12" cy="12" r="9.75" />
          </clipPath>
        </defs>

        {/* Stationary Crisp Outer Ring Frame */}
        <circle cx="12" cy="12" r="9.75" stroke={color} strokeWidth="1.75" />

        {/* Clipped Inner Web Lines that smoothly rotate horizontally */}
        <g clipPath="url(#webGlobeClip)">
          {/* Horizontal Latitude Parallels */}
          <line x1="2" y1="8" x2="22" y2="8" stroke={color} strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.65" />
          <line x1="1" y1="12" x2="23" y2="12" stroke={color} strokeWidth="1.3" opacity="0.85" />
          <line x1="2" y1="16" x2="22" y2="16" stroke={color} strokeWidth="1.1" strokeDasharray="1.5 1.5" opacity="0.65" />

          {/* Smooth 3D Horizontally Rotating Longitude Web Lines */}
          <g className="animate-web-horizontal-spin" style={{ transformOrigin: '12px 12px' }}>
            <ellipse
              cx="12"
              cy="12"
              rx="4"
              ry="9.75"
              stroke={color}
              strokeWidth="1.4"
              fill="none"
            />
            <ellipse
              cx="12"
              cy="12"
              rx="8"
              ry="9.75"
              stroke={color}
              strokeWidth="1.2"
              strokeDasharray="2 1.5"
              opacity="0.75"
              fill="none"
            />
            <line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="1.4" opacity="0.9" />
          </g>
        </g>
      </svg>
    </span>
  );
};
