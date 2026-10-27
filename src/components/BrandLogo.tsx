import React, { useId } from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number | string;
  includeBackground?: boolean;
}

export function BrandLogo({ className = '', size = '100%', includeBackground = true }: BrandLogoProps) {
  const idValue = useId().replace(/:/g, '-');
  const ringGradId = `glassRingGrad-${idValue}`;
  const fillGradId = `glassFillGrad-${idValue}`;
  const sphereGradId = `glassSphereGrad-${idValue}`;
  const shadowFilterId = `brandShadow-${idValue}`;
  const glowFilterId = `brandGlow-${idValue}`;

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      width={size} 
      height={size} 
      className={`${className} transition-transform duration-350 max-w-full h-auto`}
    >
      <defs>
        {/* Soft 3D Neon Glow Filter */}
        <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Deep 3D Shadow */}
        <filter id={shadowFilterId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000" floodOpacity="0.8" />
        </filter>

        {/* 3D Gloss Ring Gradient: Neon Blue and Violet */}
        <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" /> {/* Light Cyan/Blue */}
          <stop offset="50%" stopColor="#4f46e5" /> {/* Indigo */}
          <stop offset="100%" stopColor="#c084fc" /> {/* Purple */}
        </linearGradient>

        {/* Liquid Glass Wave Shape Gradient */}
        <linearGradient id={fillGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#2563eb" stopOpacity="0.75" />
          <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.8" />
        </linearGradient>

        {/* Spherical Inner Core Radial Gradient */}
        <radialGradient id={sphereGradId} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#93c5fd" stopOpacity="0.85" />
          <stop offset="65%" stopColor="#2563eb" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      {/* Black ambient glow background */}
      {includeBackground && (
        <circle cx="256" cy="256" r="236" fill="#000000" opacity="0.9" />
      )}

      <g filter={`url(#${shadowFilterId})`}>
        {/* Outer Circular Ring (Sleek gloss rim) */}
        <circle 
          cx="256" 
          cy="256" 
          r="200" 
          fill="none" 
          stroke={`url(#${ringGradId})`} 
          strokeWidth="28" 
          filter={`url(#${glowFilterId})`}
          opacity="0.95"
        />

        {/* Inner Highlight Reflection on Ring */}
        <circle 
          cx="256" 
          cy="256" 
          r="198" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="3" 
          strokeDasharray="400 1200" 
          transform="rotate(-45 256 256)"
          opacity="0.7"
        />

        {/* 1. Glossy Blue Glass Sphere (Head of the figure) */}
        <circle cx="218" cy="160" r="34" fill={`url(#${sphereGradId})`} />
        {/* Sphere highlight glare */}
        <circle cx="208" cy="150" r="10" fill="#ffffff" opacity="0.75" />

        {/* 2. Wave-like abstract liquid glass body shape inside the circle */}
        {/* Drawn precisely to match the iconic curved shape inside the circular badge */}
        <path 
          d="M 120 250 
             C 120 220, 160 180, 210 240 
             C 250 290, 290 280, 310 190 
             C 320 160, 350 140, 380 180 
             C 410 220, 420 320, 330 360 
             C 270 390, 240 370, 250 310 
             C 255 280, 220 260, 195 295
             C 170 330, 140 340, 120 250 Z" 
          fill={`url(#${fillGradId})`}
          opacity="0.88"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2.5"
          filter={`url(#${glowFilterId})`}
        />

        {/* Specular gloss highlights over the body path */}
        <path 
          d="M 130 250 C 135 235, 155 205, 185 242" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="4.5" 
          strokeLinecap="round" 
          opacity="0.8" 
        />
        
        <path 
          d="M 315 195 C 322 170, 340 155, 365 185" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="4.5" 
          strokeLinecap="round" 
          opacity="0.85" 
        />
        
        <path 
          d="M 320 350 C 370 320, 395 240, 375 200" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          opacity="0.45" 
        />
      </g>
    </svg>
  );
}
