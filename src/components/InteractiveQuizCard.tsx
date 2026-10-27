import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, BookOpen, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { formatMathAndFractions } from '../lib/mathFormatter';

export interface QuizPayload {
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
  explanation: string;
}

interface InteractiveQuizCardProps {
  quiz: QuizPayload;
  isLight?: boolean;
  onAnswerSelected?: (selectedIndex: number, isCorrect: boolean) => void;
}

export const InteractiveQuizCard: React.FC<InteractiveQuizCardProps> = ({
  quiz,
  isLight = false,
  onAnswerSelected,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) return; // Prevent changing after submission
    setSelectedIndex(index);
    setShowExplanation(true);
    if (onAnswerSelected) {
      onAnswerSelected(index, index === quiz.correctIndex);
    }
  };

  const handleReset = () => {
    setSelectedIndex(null);
    setShowExplanation(false);
    setShowHint(false);
  };

  const isAnswered = selectedIndex !== null;
  const isCorrect = selectedIndex === quiz.correctIndex;

  return (
    <div
      className={`w-full my-3.5 rounded-2xl p-4 sm:p-5 border transition-all ${
        isLight
          ? 'bg-gradient-to-br from-indigo-50/70 to-slate-50 border-indigo-200/80 text-zinc-900 shadow-sm'
          : 'bg-gradient-to-br from-indigo-950/20 to-zinc-900/60 border-indigo-500/30 text-zinc-100 shadow-md'
      }`}
    >
      {/* Quiz Header with unboxed metadata */}
      <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-inherit">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight text-indigo-400">
              Interactive Knowledge Check
            </div>
            <div className="text-[11px] text-zinc-400">
              Retrieval practice · Test your understanding
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quiz.hint && !isAnswered && (
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                showHint
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : isLight
                  ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
              title="Toggle Socratic hint"
            >
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
              {showHint ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {isAnswered && (
            <button
              type="button"
              onClick={handleReset}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
              title="Retry quiz"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>

      {/* Socratic Hint Box */}
      {showHint && quiz.hint && !isAnswered && (
        <div
          className={`mb-3.5 p-3 rounded-xl border text-xs leading-relaxed animate-fade-in ${
            isLight
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="font-semibold mb-1 flex items-center gap-1.5 text-amber-400">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Socratic Hint:</span>
          </div>
          <div>{formatMathAndFractions(quiz.hint)}</div>
        </div>
      )}

      {/* Question Prompt */}
      <div className="mb-4 text-xs sm:text-sm font-semibold leading-relaxed">
        {formatMathAndFractions(quiz.question)}
      </div>

      {/* Interactive Options Grid */}
      <div className="grid grid-cols-1 gap-2">
        {quiz.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isThisSelected = selectedIndex === idx;
          const isThisCorrect = quiz.correctIndex === idx;

          let optionStyle = isLight
            ? 'bg-white hover:bg-indigo-50/60 border-zinc-200 text-zinc-800'
            : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 text-zinc-200';

          if (isAnswered) {
            if (isThisCorrect) {
              optionStyle = isLight
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold ring-1 ring-emerald-500/30'
                : 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200 font-semibold ring-1 ring-emerald-500/40';
            } else if (isThisSelected && !isThisCorrect) {
              optionStyle = isLight
                ? 'bg-rose-50 border-rose-400 text-rose-900'
                : 'bg-rose-500/15 border-rose-500/50 text-rose-200';
            } else {
              optionStyle = isLight
                ? 'bg-zinc-100/60 border-zinc-200 text-zinc-400 opacity-60'
                : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 opacity-60';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-3 transition-all cursor-pointer ${optionStyle} ${
                !isAnswered ? 'hover:scale-[1.005] active:scale-[0.995]' : ''
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                  isAnswered && isThisCorrect
                    ? 'bg-emerald-500 text-white'
                    : isAnswered && isThisSelected
                    ? 'bg-rose-500 text-white'
                    : isLight
                    ? 'bg-zinc-200 text-zinc-700'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {letter}
              </span>
              <span className="flex-1 leading-snug">{formatMathAndFractions(option)}</span>
              {isAnswered && isThisCorrect && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {isAnswered && isThisSelected && !isThisCorrect && (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Answer & Explanation Reveal */}
      {showExplanation && (
        <div
          className={`mt-4 p-3.5 rounded-xl border text-xs leading-relaxed animate-fade-in ${
            isCorrect
              ? isLight
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : isLight
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Great job! Correct Answer</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Not quite. Let's understand why:</span>
              </>
            )}
          </div>
          <div>{formatMathAndFractions(quiz.explanation)}</div>
        </div>
      )}
    </div>
  );
};

// Helper function to extract and parse quiz JSON block from raw AI markdown text
export function parseQuizFromText(text: string): { cleanText: string; quiz: QuizPayload | null } {
  if (!text) return { cleanText: text, quiz: null };

  const quizRegex = /```quiz\s*\n([\s\S]*?)\n```/i;
  const match = text.match(quizRegex);

  if (!match) {
    return { cleanText: text, quiz: null };
  }

  try {
    const rawJson = match[1].trim();
    const parsed = JSON.parse(rawJson);

    if (parsed.question && Array.isArray(parsed.options) && typeof parsed.correctIndex === 'number') {
      const cleanText = text.replace(quizRegex, '').trim();
      return {
        cleanText,
        quiz: {
          question: parsed.question,
          options: parsed.options,
          correctIndex: parsed.correctIndex,
          hint: parsed.hint || undefined,
          explanation: parsed.explanation || 'Review the core concept above for complete step-by-step guidance.',
        },
      };
    }
  } catch (e) {
    console.warn('[InteractiveQuizCard] Failed to parse quiz block:', e);
  }

  return { cleanText: text, quiz: null };
}
