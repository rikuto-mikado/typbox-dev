import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, FlaskConical, Loader2, Shuffle } from 'lucide-react';
import { useI18n } from './i18n';
import { api } from './api';

// A "discover a paper" panel: one random arXiv paper (title, authors,
// abstract, link) at a time, rotated client-side for a "live" feel.
// arXiv's API has no CORS headers, so it's fetched through the backend's
// /research/discover/ proxy (see tracker/views.py:ArxivDiscoveryView)
// rather than directly from the browser. Paper metadata from arXiv is CC0
// (public domain) per https://info.arxiv.org/help/api/tou.html, so no
// attribution is legally required — the "Read on arXiv" link is just good
// manners and lets you actually open the paper.

interface ResearchPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  url: string;
  primaryCategory: string;
}

const ROTATE_MS = 90_000;

interface ResearchDiscoveryPanelProps {
  borderCol: string;
  textMuted: string;
  isDark: boolean;
}

export const ResearchDiscoveryPanel: React.FC<ResearchDiscoveryPanelProps> = ({ borderCol, textMuted, isDark }) => {
  const { t } = useI18n();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [category, setCategory] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [index, setIndex] = useState(0);
  // Bumped by both Retry and Shuffle; `shuffleExclude` (read once per bump,
  // via the ref below) tells the load effect whether this run should ask
  // the backend for a category other than the one just shown.
  const [reloadNonce, setReloadNonce] = useState(0);
  const shuffleExcludeRef = useRef<string | null>(null);
  // Tracks which index was last expanded, rather than a plain boolean, so
  // rotating/shuffling to a new paper re-collapses its abstract without an effect.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const expanded = expandedIndex === index;
  const current = papers.length > 0 ? papers[index % papers.length] : null;

  // Whether the clamped abstract actually overflows 4 lines — measured via
  // ResizeObserver (same approach the cadence matrix uses for column-fit)
  // rather than a character-count guess, since the right length cutoff
  // differs by panel width (mobile full-width vs the narrower desktop
  // column) and font. Keyed on the paper's id rather than `index`: SHUFFLE
  // re-fetches a new batch and resets index back to 0, so depending on
  // `index` alone would silently skip remeasuring whenever the new paper
  // also happened to land at index 0.
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  useEffect(() => {
    const el = textRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [current?.id]);

  useEffect(() => {
    let cancelled = false;
    const exclude = shuffleExcludeRef.current ?? undefined;
    shuffleExcludeRef.current = null;
    const load = async () => {
      setStatus('loading');
      try {
        const data = await api.research.discover(undefined, exclude);
        if (cancelled) return;
        setCategory(data.category);
        setCategoryLabel(data.categoryLabel);
        setPapers(data.papers);
        setIndex(0);
        setExpandedIndex(null);
        setStatus(data.papers.length > 0 ? 'ready' : 'error');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  // Calm auto-rotation through the fetched batch, one at a time, so the
  // panel feels alive without another network request.
  useEffect(() => {
    if (papers.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % papers.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [papers.length]);

  const authorsLine = useMemo(() => {
    if (!current) return '';
    const names = current.authors;
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  }, [current]);

  return (
    <>
      <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
        <div className="flex items-center space-x-2">
          <FlaskConical className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">{t.researchTitle}</h2>
        </div>
        {categoryLabel && (
          <span className={`font-mono text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {categoryLabel.toUpperCase()}
          </span>
        )}
      </div>

      <div className="pt-3">
        {status === 'loading' && (
          <div className={`py-8 flex items-center justify-center gap-2 font-mono text-xs ${textMuted}`}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t.researchLoading}</span>
          </div>
        )}

        {status === 'error' && (
          <div className={`py-6 text-center space-y-2 font-mono text-xs ${textMuted}`}>
            <p>{t.researchError}</p>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className={`px-2.5 py-1 border ${borderCol} uppercase text-[10px] hover:text-emerald-400 transition-colors cursor-pointer`}
            >
              {t.researchRetry}
            </button>
          </div>
        )}

        {status === 'ready' && current && (
          <div className="min-h-[72px]">
            <p className={`text-sm font-sans font-semibold leading-snug ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {current.title}
            </p>
            <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider truncate ${textMuted}`}>{authorsLine}</p>
            <p
              ref={textRef}
              className={`mt-2 text-xs font-sans leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'} ${
                !expanded ? 'line-clamp-4' : ''
              }`}
            >
              {current.summary}
            </p>
            <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1">
              {(isOverflowing || expanded) && (
                <button
                  type="button"
                  onClick={() => setExpandedIndex(expanded ? null : index)}
                  className={`font-mono text-[10px] uppercase tracking-wider underline cursor-pointer ${
                    isDark ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  {expanded ? t.researchViewLess : t.researchViewMore}
                </button>
              )}
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider underline cursor-pointer ${
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              >
                <span>{t.researchReadMore}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      <div
        className={`flex items-center justify-between gap-2 pt-3 mt-3 border-t font-mono ${
          isDark ? 'border-zinc-800/50' : 'border-zinc-200'
        }`}
      >
        <span className={`text-[10px] uppercase tracking-wider ${textMuted}`}>
          {status === 'ready' && current ? current.published : t.researchSource}
        </span>
        <button
          type="button"
          onClick={() => {
            setExpandedIndex(null);
            shuffleExcludeRef.current = category || null;
            setReloadNonce((n) => n + 1);
          }}
          disabled={status === 'loading'}
          className={`min-h-[32px] lg:min-h-0 px-3 py-1.5 border ${borderCol} text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark ? 'text-zinc-200 hover:bg-zinc-800/50' : 'text-zinc-800 hover:bg-zinc-100'
          } hover:text-emerald-400`}
        >
          <Shuffle className="w-3 h-3" />
          <span>{t.researchShuffle}</span>
        </button>
      </div>
    </>
  );
};
