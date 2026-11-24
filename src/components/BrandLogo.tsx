import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number | string;
  includeBackground?: boolean;
}

// All app surfaces share the exact public logo asset instead of maintaining
// a separate inline SVG that can render differently between browsers.
export function BrandLogo({ className = '', size = '100%' }: BrandLogoProps) {
  const numericSize = typeof size === 'number' ? size : undefined;
  return (
    <img
      src="/isaiahai-logo.svg"
      alt="IsaiahAI logo"
      width={numericSize}
      height={numericSize}
      className={`block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size, display: 'block', objectFit: 'contain' }}
      decoding="async"
      draggable={false}
    />
  );
}
