import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

interface FaceTimeVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStatus: string;
  liveVolume: number; // 0 to 100
}

/**
 * Play a smooth, warm, airy harmonic opening chord (analogous to the clean iOS/ChatGPT/Siri voice prompt tone)
 */
function playSmoothOpenSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Harmonic frequencies for a pure, uplifting, warm chord (e.g. C5 - E5 - G5 - C6)
    const tones = [
      { freq: 523.25, gain: 0.14, start: 0.00, dur: 0.85 }, // C5
      { freq: 659.25, gain: 0.12, start: 0.04, dur: 0.80 }, // E5
      { freq: 783.99, gain: 0.10, start: 0.08, dur: 0.90 }, // G5
      { freq: 1046.50, gain: 0.08, start: 0.12, dur: 1.05 } // C6 (Airy bell top)
    ];

    const masterGain = ctx.createGain();
    // Warm lowpass filter to remove harshness and create an organic, ultra-smooth sheen
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(0.7, now);

    masterGain.connect(filter);
    filter.connect(ctx.destination);

    tones.forEach(({ freq, gain, start, dur }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Sine wave with slight harmonic richness for smooth acoustic bell vibe
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      // Gentle pitch glide for organic softness
      osc.frequency.exponentialRampToValueAtTime(freq * 1.008, now + start + 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq, now + start + 0.2);

      // Smooth attack and exponential decay
      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.035);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });

    // Close audio context after sound decay
    setTimeout(() => {
      try {
        ctx.close();
      } catch (e) {}
    }, 1200);
  } catch (e) {
    console.warn('[VoiceChat] Could not play opening sound:', e);
  }
}

export function FaceTimeVoiceModal({
  isOpen,
  onClose,
  liveStatus,
  liveVolume,
}: FaceTimeVoiceModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blink, setBlink] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const hasPlayedOpenSoundRef = useRef(false);

  // Play smooth opening chime upon opening
  useEffect(() => {
    if (isOpen) {
      if (!hasPlayedOpenSoundRef.current) {
        playSmoothOpenSound();
        hasPlayedOpenSoundRef.current = true;
      }
    } else {
      hasPlayedOpenSoundRef.current = false;
    }
  }, [isOpen]);

  // Call timer
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      return;
    }
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Random eye blinking timer for realism
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate dynamic mouth height and jaw drop based on live volume decibels (0 to 100)
  const isSpeaking = liveVolume > 3;
  // Mouth openness ratio 0.0 to 1.0
  const mouthOpenness = Math.min(1.0, Math.max(0, (liveVolume - 3) / 45));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-fade-in select-none">
      {/* FaceTime Container - Pure, Blank Pristine White Background */}
      <div 
        className={`relative bg-white text-zinc-900 rounded-[36px] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-md h-[640px]'
        }`}
      >
        {/* Top Header Bar - Minimalist Blank White Header */}
        <div className="relative z-20 flex items-center justify-between px-6 pt-5 pb-3 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-zinc-900">Isaiah AI Max</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full border border-amber-200/60 font-mono">
                  Voice
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">{formatTime(callDuration)} • {liveStatus}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Central FaceTime Stage - Blank Pristine White Canvas with the Classic Smooth Expressive Smiley Face */}
        <div className="relative flex-1 bg-white flex items-center justify-center overflow-hidden">
          {/* Outer Breathing Glow Aura when speaking */}
          {isSpeaking && (
            <div 
              className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border-4 border-amber-300/40 animate-ping pointer-events-none"
              style={{ animationDuration: '1.4s' }}
            />
          )}

          {/* Main Glossy Emoji Face Canvas Container */}
          <div 
            className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full shadow-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 border-4 border-yellow-100/90 flex items-center justify-center transform transition-transform duration-150 ease-out"
            style={{
              transform: `scale(${1 + mouthOpenness * 0.04}) translateY(${Math.sin(Date.now() / 400) * 3}px)`,
              boxShadow: isSpeaking 
                ? '0 25px 60px rgba(245, 158, 11, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.9)' 
                : '0 18px 40px rgba(217, 119, 6, 0.20), inset 0 2px 8px rgba(255, 255, 255, 0.9)'
            }}
          >
            {/* Top Gloss Highlight */}
            <div className="absolute top-3 left-10 right-10 h-16 rounded-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />

            {/* Blush Cheeks */}
            <div className="absolute top-[52%] left-6 w-10 h-6 rounded-full bg-amber-500/30 blur-xs" />
            <div className="absolute top-[52%] right-6 w-10 h-6 rounded-full bg-amber-500/30 blur-xs" />

            {/* EYES CONTAINER - Blinking Logic */}
            <div className="absolute top-[32%] inset-x-0 flex items-center justify-between px-14 sm:px-16 pointer-events-none">
              {blink ? (
                /* Blinking Eye Curved Stroke (^ ^) */
                <>
                  <svg className="w-12 h-8" viewBox="0 0 50 30">
                    <path d="M 5,20 Q 25,5 45,20" stroke="#372607" strokeWidth="6" fill="none" strokeLinecap="round" />
                  </svg>
                  <svg className="w-12 h-8" viewBox="0 0 50 30">
                    <path d="M 5,20 Q 25,5 45,20" stroke="#372607" strokeWidth="6" fill="none" strokeLinecap="round" />
                  </svg>
                </>
              ) : (
                /* Open Shiny Expressive Emoji Eyes */
                <>
                  <div className="relative w-12 h-14 sm:w-14 sm:h-16 rounded-full bg-[#271a04] flex items-center justify-center shadow-inner overflow-hidden">
                    {/* Shiny Pupil Highlights */}
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white" />
                    <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-white/80" />
                  </div>
                  <div className="relative w-12 h-14 sm:w-14 sm:h-16 rounded-full bg-[#271a04] flex items-center justify-center shadow-inner overflow-hidden">
                    {/* Shiny Pupil Highlights */}
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white" />
                    <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-white/80" />
                  </div>
                </>
              )}
            </div>

            {/* MOVING MOUTH CONTAINER - Live Audio Decibel Driven */}
            <div className="absolute bottom-[18%] inset-x-0 flex items-center justify-center pointer-events-none">
              <svg 
                viewBox="0 0 100 80" 
                className="w-28 h-20 sm:w-32 sm:h-24 transition-all duration-75"
              >
                {isSpeaking ? (
                  /* Animated Open Mouth Cavity with Tongue & Teeth */
                  <g>
                    {/* Dark Mouth Interior */}
                    <path 
                      d={`M 15,25 Q 50,${15 + mouthOpenness * 15} 85,25 Q 50,${55 + mouthOpenness * 40} 15,25 Z`} 
                      fill="#2f0d15" 
                    />
                    {/* Top White Teeth */}
                    <path 
                      d={`M 22,25 Q 50,28 78,25 L 75,${32 + mouthOpenness * 5} Q 50,35 25,${32 + mouthOpenness * 5} Z`} 
                      fill="#ffffff" 
                    />
                    {/* Dynamic Tongue */}
                    <path 
                      d={`M 30,${50 + mouthOpenness * 10} Q 50,${35 - mouthOpenness * 10} 70,${50 + mouthOpenness * 10} Q 50,${70 + mouthOpenness * 15} 30,${50 + mouthOpenness * 10} Z`} 
                      fill="#ff5252" 
                    />
                    {/* Lip Contour */}
                    <path 
                      d={`M 15,25 Q 50,${15 + mouthOpenness * 15} 85,25 Q 50,${55 + mouthOpenness * 40} 15,25 Z`} 
                      stroke="#4e2007" 
                      strokeWidth="3.5" 
                      fill="none" 
                    />
                  </g>
                ) : (
                  /* Idle Happy Smile Lip Curve */
                  <path 
                    d="M 20,35 Q 50,65 80,35" 
                    stroke="#3b2505" 
                    strokeWidth="7" 
                    fill="none" 
                    strokeLinecap="round" 
                  />
                )}
              </svg>
            </div>
          </div>

          {/* Clean White Floating Live Volume Equalizer */}
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white shadow-sm border border-zinc-100">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-zinc-700">Voice Assistant Active</span>
            </div>

            {/* Waveform Equalizer */}
            <div className="flex items-end gap-1 h-5 select-none">
              {[0.4, 0.8, 1.2, 0.6, 1.0, 0.7, 1.4, 0.5, 0.9].map((factor, idx) => {
                const h = Math.max(3, Math.min(20, liveVolume * factor));
                return (
                  <div
                    key={idx}
                    style={{ height: `${h}px` }}
                    className="w-1 rounded-full bg-amber-500 transition-all duration-75"
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* FaceTime Bottom Control Bar - Pristine White Surface */}
        <div className="px-6 py-6 bg-white border-t border-zinc-100 flex items-center justify-around z-20">
          {/* Mute Mic Button */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
              isMuted ? 'bg-zinc-800 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End Call Button (Red FaceTime Pill) */}
          <button
            type="button"
            onClick={onClose}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:shadow-rose-600/30 active:scale-95"
            title="End Voice Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Audio Mode Badge */}
          <div className="w-14 h-14 rounded-full bg-zinc-100 text-zinc-600 flex flex-col items-center justify-center font-mono text-[10px] font-bold">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-[9px] mt-0.5">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
