import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from './api';
import { BitShard, StudyTime } from './BitsBadge';
import { tf, useI18n } from './i18n';
import { NewsFigure, type FigureContext } from './NewsFigures';
import { NEWS_ARTICLES, type NewsArticle, type NewsBlock, type ShowcaseRoom, type TourRoom } from './news';
import { renderRoom, type FurnitureSpec } from './roomRender';

// 06 / NEWS: the list of articles (news.ts), newest first; tapping one
// opens it in place. Room galleries are drawn live by the room renderer
// from the server's furniture catalog, with a day / night switch.

type NewsPanelProps = FigureContext;
type Catalog = Record<string, FurnitureSpec>;

const ShowcaseRoomCard: React.FC<{
  room: ShowcaseRoom;
  catalog: Catalog;
  borderCol: string;
  textMuted: string;
  /** Controlled day / night (the tour keeps it while paging). */
  night?: boolean;
  onNight?: (night: boolean) => void;
  footer?: React.ReactNode;
}> = ({ room, catalog, borderCol, textMuted, night: nightProp, onNight, footer }) => {
  const { t } = useI18n();
  const [ownNight, setOwnNight] = useState(false);
  const night = nightProp ?? ownNight;
  const setNight = onNight ?? setOwnNight;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) renderRoom(canvasRef.current, room.layout, catalog, { env: { on: true, night } });
  }, [room, catalog, night]);

  return (
    <figure className={`m-0 border ${borderCol} p-2 flex flex-col gap-2`}>
      <canvas
        ref={canvasRef}
        aria-label={room.name}
        className={`block w-full aspect-4/3 border ${borderCol}`}
        style={{ imageRendering: 'pixelated' }}
      />
      <figcaption className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold tracking-wider">{room.name}</span>
          <span className={`inline-flex border ${borderCol} text-[9px]`} role="group" aria-label={t.newsTimeOfDay}>
            {([false, true] as const).map((isNight) => (
              <button
                key={String(isNight)}
                type="button"
                aria-pressed={night === isNight}
                onClick={() => setNight(isNight)}
                className={`px-1.5 py-0.5 cursor-pointer ${isNight ? `border-l ${borderCol}` : ''} ${
                  night === isNight ? 'bg-emerald-500 text-zinc-950 font-bold' : textMuted
                }`}
              >
                {isNight ? t.newsNight : t.newsDay}
              </button>
            ))}
          </span>
        </div>
        <p className={`m-0 text-[10px] font-sans leading-relaxed ${textMuted}`}>{room.desc}</p>
        {footer}
      </figcaption>
    </figure>
  );
};

// The live furniture catalog for the galleries (one fetch per gallery).
const useShowcaseCatalog = () => {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api.room
      .get()
      .then((state) => {
        if (cancelled) return;
        const map: Catalog = {};
        state.catalog.forEach((spec) => {
          map[spec.id] = spec;
        });
        setCatalog(map);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);
  return { catalog, error };
};

const GalleryFallback: React.FC<{ error: boolean; textMuted: string }> = ({ error, textMuted }) => {
  const { t } = useI18n();
  if (error) return <p className={`m-0 text-[10px] ${textMuted}`}>{t.newsRoomsUnavailable}</p>;
  return (
    <div className={`p-6 flex justify-center ${textMuted}`}>
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  );
};

const RoomGallery: React.FC<{ rooms: ShowcaseRoom[]; borderCol: string; textMuted: string }> = ({
  rooms,
  borderCol,
  textMuted,
}) => {
  const { catalog, error } = useShowcaseCatalog();
  if (!catalog) return <GalleryFallback error={error} textMuted={textMuted} />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {rooms.map((room) => (
        <ShowcaseRoomCard key={room.name} room={room} catalog={catalog} borderCol={borderCol} textMuted={textMuted} />
      ))}
    </div>
  );
};

const SWIPE_PX = 40;

// ROOM TOUR: one room at a time, paged with the arrows, the dots, a swipe
// or ← / → while the tour has focus. Day / night carries across rooms.
const RoomTour: React.FC<{ rooms: TourRoom[]; borderCol: string; textMuted: string }> = ({ rooms, borderCol, textMuted }) => {
  const { t } = useI18n();
  const { catalog, error } = useShowcaseCatalog();
  const [index, setIndex] = useState(0);
  const [night, setNight] = useState(false);
  const swipeFrom = useRef<number | null>(null);
  const go = (step: number) => setIndex((i) => (i + step + rooms.length) % rooms.length);

  if (!catalog) return <GalleryFallback error={error} textMuted={textMuted} />;
  const room = rooms[index];
  const value =
    room.layout.items.reduce((sum, it) => sum + (catalog[it.id]?.price ?? 0), 0) +
    (catalog[room.layout.wall]?.price ?? 0) +
    (catalog[room.layout.floor]?.price ?? 0);
  const arrow = `w-7 h-7 shrink-0 border ${borderCol} flex items-center justify-center ${textMuted} hover:text-emerald-400 hover:border-emerald-500/60 cursor-pointer`;

  return (
    <section
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="ROOM TOUR"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === 'ArrowRight') go(1);
        else return;
        e.preventDefault();
      }}
      className="flex flex-col gap-2 outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/60"
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => go(-1)} className={arrow} aria-label={t.newsTourPrev}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1 flex items-center justify-center gap-2 text-[10px] tracking-wider" aria-live="polite">
          <span className="px-1.5 py-0.5 border border-emerald-500/60 text-emerald-400 font-bold truncate">{room.pack}</span>
          <span className={`tabular-nums shrink-0 ${textMuted}`}>
            {String(index + 1).padStart(2, '0')} / {String(rooms.length).padStart(2, '0')}
          </span>
        </div>
        <button type="button" onClick={() => go(1)} className={arrow} aria-label={t.newsTourNext}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div
        className="touch-pan-y select-none"
        onPointerDown={(e) => {
          swipeFrom.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipeFrom.current === null) return;
          const dx = e.clientX - swipeFrom.current;
          swipeFrom.current = null;
          if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipeFrom.current = null;
        }}
      >
        <ShowcaseRoomCard
          key={room.name}
          room={room}
          catalog={catalog}
          borderCol={borderCol}
          textMuted={textMuted}
          night={night}
          onNight={setNight}
          footer={
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tabular-nums ${textMuted}`}>
              <span>{tf(t.newsTourPieces, { n: room.layout.items.length })}</span>
              <span className="flex items-center gap-1" title={t.newsTourValue}>
                <BitShard className="w-2.5 h-2.5" />
                <span className="font-bold text-amber-400">{value.toLocaleString('en-US')}</span>
                <StudyTime bits={value} />
              </span>
            </div>
          }
        />
      </div>
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="ROOM TOUR">
        {rooms.map((r, i) => (
          <button
            key={r.name}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={tf(t.newsTourGoto, { n: i + 1, name: r.name })}
            aria-current={i === index}
            title={r.pack}
            className="p-1 cursor-pointer group"
          >
            <span
              className={`block w-2 h-2 rotate-45 transition-colors ${
                i === index ? 'bg-emerald-400' : 'bg-zinc-500/40 group-hover:bg-emerald-400/60'
              }`}
            />
          </button>
        ))}
      </div>
      <p className={`m-0 text-center text-[9px] ${textMuted}`}>{t.newsTourHint}</p>
    </section>
  );
};

const Block: React.FC<{ block: NewsBlock; ctx: FigureContext; onOpen: (id: string) => void }> = ({ block, ctx, onOpen }) => {
  const { borderCol, textMuted } = ctx;
  switch (block.type) {
    case 'figure':
      return <NewsFigure kind={block.kind} caption={block.caption} {...ctx} />;
    case 'h':
      return <h4 className="m-0 pt-2 text-[11px] font-bold uppercase tracking-widest text-emerald-400">{block.text}</h4>;
    case 'p':
      return <p className="m-0 text-[12px] font-sans leading-relaxed max-w-[64ch]">{block.text}</p>;
    case 'list':
      return (
        <ul className="m-0 pl-0 list-none space-y-1.5 max-w-[64ch]">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2 text-[12px] font-sans leading-relaxed">
              <span className="text-emerald-400 font-mono shrink-0" aria-hidden>
                ›
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'stats':
      return (
        <dl className={`m-0 grid grid-cols-1 sm:grid-cols-3 border-l border-t ${borderCol}`}>
          {block.items.map(([label, value]) => (
            <div key={label} className={`px-3 py-2 border-r border-b ${borderCol}`}>
              <dt className={`text-[9px] uppercase tracking-wider ${textMuted}`}>{label}</dt>
              <dd className="m-0 text-[13px] font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      );
    case 'rooms':
      return <RoomGallery rooms={block.rooms} borderCol={borderCol} textMuted={textMuted} />;
    case 'tour':
      return <RoomTour rooms={block.rooms} borderCol={borderCol} textMuted={textMuted} />;
    case 'link':
      return (
        <button
          type="button"
          onClick={() => onOpen(block.article)}
          className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1.5 border ${borderCol} text-[11px] font-bold text-emerald-400 hover:border-emerald-500/60 hover:bg-emerald-500/5 cursor-pointer text-left`}
        >
          {block.text}
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      );
  }
};

const ArticleView: React.FC<{
  article: NewsArticle;
  onBack: () => void;
  onOpen: (id: string) => void;
  ctx: FigureContext;
}> = ({ article, onBack, onOpen, ctx }) => {
  const { borderCol, textMuted } = ctx;
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  // Opening an article from far down the list starts reading at its top.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'start' });
  }, [article.id]);
  return (
    <article ref={ref} className="space-y-4 scroll-mt-2">
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${textMuted} hover:text-emerald-400 cursor-pointer`}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t.newsBack}
      </button>
      {/* flex + gap, not space-y: the blocks carry m-0, which would cancel space-y's margins */}
      <header className={`flex flex-col gap-2 pb-3 border-b ${borderCol}`}>
        <div className="flex flex-wrap items-center gap-2 text-[10px] tracking-wider">
          <span className="px-1.5 py-0.5 border border-emerald-500/60 text-emerald-400 font-bold">{article.tag}</span>
          <span className={textMuted}>{article.date}</span>
        </div>
        <h3 className="m-0 text-base sm:text-lg font-bold tracking-tight text-balance">{article.title}</h3>
        <p className={`m-0 text-[12px] font-sans leading-relaxed max-w-[64ch] ${textMuted}`}>{article.lede}</p>
      </header>
      <div className="flex flex-col gap-3.5">
        {article.blocks.map((block, i) => (
          <Block key={`${article.id}-${i}`} block={block} ctx={ctx} onOpen={onOpen} />
        ))}
      </div>
    </article>
  );
};

export const NewsPanel: React.FC<NewsPanelProps> = (ctx) => {
  const { borderCol, textMuted } = ctx;
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const article = useMemo(() => NEWS_ARTICLES.find((a) => a.id === openId) ?? null, [openId]);

  if (article) {
    return (
      <div className="font-mono text-xs">
        <ArticleView key={article.id} article={article} onBack={() => setOpenId(null)} onOpen={setOpenId} ctx={ctx} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 font-mono text-xs">
      <p className={`m-0 text-[10px] ${textMuted}`}>{t.newsIntro}</p>
      <ol className={`m-0 p-0 list-none border-l border-t ${borderCol}`}>
        {NEWS_ARTICLES.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setOpenId(a.id)}
              className={`w-full text-left px-3 py-2.5 border-r border-b ${borderCol} flex items-start gap-3 hover:bg-emerald-500/5 cursor-pointer`}
            >
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-2 text-[9px] tracking-wider">
                  <span className={i === 0 ? 'text-emerald-400 font-bold' : textMuted}>{a.tag}</span>
                  <span className={textMuted}>{a.date}</span>
                </span>
                <span className="block text-[12px] font-bold">{a.title}</span>
                <span className={`block text-[10px] font-sans leading-relaxed ${textMuted}`}>{a.lede}</span>
              </span>
              <ChevronRight className={`w-4 h-4 shrink-0 mt-1 ${textMuted}`} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};
