import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Presentation, Sparkles, Layout } from 'lucide-react';

interface Slide {
  title: string;
  bulletPoints: string[];
  backgroundQuery?: string;
  gifQuery?: string;
  backgroundUrl?: string;
  gifUrl?: string;
}

interface SlideCarouselProps {
  slidesData: {
    title: string;
    slides: Slide[];
  };
  googleAccessToken: string | null;
  currentUser: any | null;
}

export const SlideCarousel: React.FC<SlideCarouselProps> = ({
  slidesData,
  googleAccessToken,
  currentUser,
}) => {
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [googleSlideUrl, setGoogleSlideUrl] = useState<string | null>(null);

  const title = slidesData.title || 'IsaiahAI Slide Deck';
  const slides = slidesData.slides || [];

  const handleNext = () => {
    if (currentSlideIdx < slides.length - 1) {
      setCurrentSlideIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIdx > 0) {
      setCurrentSlideIdx(prev => prev - 1);
    }
  };

  const syncToGoogleSlides = async () => {
    let token = googleAccessToken || sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
    if (!token) {
      console.warn("No Google access token found for Slides sync.");
      return;
    }

    setSyncing(true);
    try {
      // 1. Create a blank Presentation
      const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Google Slides create API rejected: ${createRes.statusText}`);
      }
      const createdPres = await createRes.json();
      const presentationId = createdPres.presentationId;

      // 2. Prepare requests to add custom slides using placeholder ID mappings
      const requests: any[] = [];

      slides.forEach((slide, idx) => {
        const slideId = `slide_page_${idx}`;
        const titleBoxId = `title_box_${idx}`;
        const bodyBoxId = `body_box_${idx}`;

        // Create a new slide with placeholder mappings mapping TITLE & BODY placeholders
        requests.push({
          createSlide: {
            objectId: slideId,
            insertionIndex: idx + 1,
            slideLayoutReference: {
              predefinedLayout: 'TITLE_AND_BODY',
            },
            placeholderIdMappings: [
              {
                layoutPlaceholder: {
                  type: 'TITLE',
                  index: 0
                },
                objectId: titleBoxId
              },
              {
                layoutPlaceholder: {
                  type: 'BODY',
                  index: 0
                },
                objectId: bodyBoxId
              }
            ]
          },
        });

        // Add slide title directly into the native TITLE placeholder box
        requests.push({
          insertText: {
            objectId: titleBoxId,
            text: slide.title,
          },
        });

        // Add text bullets directly into the native BODY placeholder box
        const bodyContent = slide.bulletPoints?.map(pt => `• ${pt}`).join('\n') || '';
        requests.push({
          insertText: {
            objectId: bodyBoxId,
            text: bodyContent,
          },
        });

        // Dynamic background picture stretch update
        if (slide.backgroundUrl) {
          requests.push({
            updatePageProperties: {
              objectId: slideId,
              pageProperties: {
                pageBackgroundFill: {
                  stretchedPictureFill: {
                    contentUrl: slide.backgroundUrl
                  }
                }
              },
              fields: 'pageBackgroundFill.stretchedPictureFill.contentUrl'
            }
          });
        }

        // Inline illustrative GIF insertion on right half of the canvas
        if (slide.gifUrl) {
          requests.push({
            createImage: {
              url: slide.gifUrl,
              elementProperties: {
                pageObjectId: slideId,
                size: {
                  width: { magnitude: 2500000, unit: 'EMU' },
                  height: { magnitude: 2500000, unit: 'EMU' }
                },
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: 6800000,
                  translateY: 1500000,
                  unit: 'EMU'
                }
              }
            }
          });
        }
      });

      // Submit formatting batch requests
      const updateRes = await fetch(
        `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: requests,
          }),
        }
      );

      if (!updateRes.ok) {
        throw new Error(`Google Slides build API rejected: ${updateRes.statusText}`);
      }

      const slidesUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;
      setGoogleSlideUrl(slidesUrl);
      try { window.open(slidesUrl, '_blank'); } catch (e) {}
    } catch (err: any) {
      console.error("Slides sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  if (slides.length === 0) {
    return (
      <div className="text-zinc-500 font-mono text-[10px]">No slides compiled in outline.</div>
    );
  }

  const activeSlide = slides[currentSlideIdx];

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4.5 space-y-4 shadow-md text-left mt-3">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Presentation className="text-amber-500 w-4 h-4 animate-pulse" />
          <span className="font-mono text-xs text-zinc-300 font-bold truncate max-w-[220px]">
            {title}
          </span>
        </div>
        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[8.5px] font-mono tracking-widest font-bold">
          {slides.length} SLIDES
        </span>
      </div>

      {/* Slide Canvas Render with Dynamic Unsplash Background */}
      <div 
        className="relative bg-zinc-900/60 rounded-xl p-4.5 border border-zinc-800 flex flex-col justify-between aspect-video select-none overflow-hidden bg-cover bg-center"
        style={activeSlide.backgroundUrl ? { backgroundImage: `url(${activeSlide.backgroundUrl})` } : undefined}
      >
        {activeSlide.backgroundUrl && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[0.5px] z-0" />
        )}

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 h-[82%] items-center overflow-y-auto">
          <div className={`${activeSlide.gifUrl ? 'md:col-span-8' : 'md:col-span-12'} space-y-2.5 pr-2`}>
            <span className="text-[9px] font-mono font-bold text-amber-400 tracking-wider block uppercase">
              SLIDE {currentSlideIdx + 1} OF {slides.length}
            </span>
            <h4 className="text-sm font-semibold text-white tracking-tight leading-snug">
              {activeSlide.title}
            </h4>
            <ul className="space-y-1.5 pl-3 text-xs leading-relaxed text-zinc-200">
              {activeSlide.bulletPoints?.map((bullet, ptIdx) => (
                <li key={ptIdx} className="list-disc pl-1 text-zinc-200">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          {activeSlide.gifUrl && (
            <div className="md:col-span-4 flex justify-center items-center h-full max-h-[140px] rounded-xl overflow-hidden border border-zinc-800 bg-black/60 p-1.5">
              <img 
                src={activeSlide.gifUrl} 
                alt="Illustrative diagram" 
                className="max-h-full max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>

        {/* Carousel controls bar */}
        <div className="relative z-10 flex justify-between items-center pt-2.5 border-t border-zinc-805/40 mt-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlideIdx === 0}
            className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-zinc-400">
            {currentSlideIdx + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlideIdx === slides.length - 1}
            className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Slide metadata tags */}
      {(activeSlide.backgroundQuery || activeSlide.gifQuery) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {activeSlide.backgroundQuery && (
            <span className="bg-zinc-950 border border-zinc-900 rounded px-2 py-0.5 text-[8.5px] font-mono text-zinc-500">
              Style Query: <strong className="text-zinc-400 font-normal">{activeSlide.backgroundQuery}</strong>
            </span>
          )}
          {activeSlide.gifQuery && (
            <span className="bg-zinc-950 border border-zinc-900 rounded px-2 py-0.5 text-[8.5px] font-mono text-zinc-500">
              GIPHY query: <strong className="text-zinc-400 font-normal">{activeSlide.gifQuery}</strong>
            </span>
          )}
        </div>
      )}

      {/* Sync tools */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          type="button"
          onClick={syncToGoogleSlides}
          disabled={syncing}
          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-105 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 scale-95 hover:scale-100 border-0"
        >
          {syncing ? (
            <div className="w-3.5 h-3.5 border-t-2 border-t-white rounded-full animate-spin" />
          ) : (
            <Presentation className="w-3.5 h-3.5" />
          )}
          <span>{syncing ? 'Syncing...' : 'Sync to Google Slides'}</span>
        </button>

        {googleSlideUrl && (
          <a
            href={googleSlideUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-semibold text-amber-500 hover:underline font-mono"
          >
            OPEN LIVE PRESENTATION ↗
          </a>
        )}
      </div>
    </div>
  );
};
