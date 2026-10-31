import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from './api';
import { useI18n } from './i18n';
import { NewsFigure, type FigureContext } from './NewsFigures';
import { NEWS_ARTICLES, type NewsArticle, type NewsBlock, type ShowcaseRoom } from './news';
import { renderRoom, type FurnitureSpec } from './roomRender';

// 06 / NEWS: the list of articles (news.ts), newest first; tapping one
// opens it in place. Room galleries are drawn live by the room renderer
// from the server's furniture catalog, with a day / night switch.

type NewsPanelProps = FigureContext;

const ShowcaseRoomCard: React.FC<{
  room: ShowcaseRoom;
  catalog: Record<string, FurnitureSpec>;
  borderCol: string;
  textMuted: string;
}> = ({ room, catalog, borderCol, textMuted }) => {
  const { t } = useI18n();
  const [night, setNight] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) renderRoom(canvasRef.current, room.layout, catalog, { env: { on: true, night } });
  }, [room, catalog, night]);

  return (
    <figure className={`m-0 border ${borderCol} p-2 space-y-2`}>
      <canvas
        ref={canvasRef}
        aria-label={room.name}
        className={`block w-full aspect-4/3 border ${borderCol}`}
        style={{ imageRendering: 'pixelated' }}
      />
      <figcaption className="space-y-1">
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
      </figcaption>
    </figure>
  );
};

const RoomGallery: React.FC<{ rooms: ShowcaseRoom[]; borderCol: string; textMuted: string }> = ({
  rooms,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<Record<string, FurnitureSpec> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.room
      .get()
      .then((state) => {
        if (cancelled) return;
        const map: Record<string, FurnitureSpec> = {};
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

  if (error) return <p className={`text-[10px] ${textMuted}`}>{t.newsRoomsUnavailable}</p>;
  if (!catalog) {
    return (
      <div className={`p-6 flex justify-center ${textMuted}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {rooms.map((room) => (
        <ShowcaseRoomCard key={room.name} room={room} catalog={catalog} borderCol={borderCol} textMuted={textMuted} />
      ))}
    </div>
  );
};

const Block: React.FC<{ block: NewsBlock; ctx: FigureContext }> = ({ block, ctx }) => {
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
  }
};

const ArticleView: React.FC<{
  article: NewsArticle;
  onBack: () => void;
  ctx: FigureContext;
}> = ({ article, onBack, ctx }) => {
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
      <header className={`space-y-2 pb-3 border-b ${borderCol}`}>
        <div className="flex flex-wrap items-center gap-2 text-[10px] tracking-wider">
          <span className="px-1.5 py-0.5 border border-emerald-500/60 text-emerald-400 font-bold">{article.tag}</span>
          <span className={textMuted}>{article.date}</span>
        </div>
        <h3 className="m-0 text-base sm:text-lg font-bold tracking-tight text-balance">{article.title}</h3>
        <p className={`m-0 text-[12px] font-sans leading-relaxed max-w-[64ch] ${textMuted}`}>{article.lede}</p>
      </header>
      <div className="space-y-3">
        {article.blocks.map((block, i) => (
          <Block key={i} block={block} ctx={ctx} />
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
        <ArticleView article={article} onBack={() => setOpenId(null)} ctx={ctx} />
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono text-xs">
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
