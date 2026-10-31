import React from 'react';
import { BUFF_ART } from './buffArt';
import { BitShard } from './BitsBadge';

// A buff's 16 x 16 pixel icon (buffArt.ts) as crisp SVG rects. Unknown ids
// (a buff added on the server before its art) fall back to the BITS shard.

interface BuffIconProps {
  itemId: string;
  className?: string;
  title?: string;
}

export const BuffIcon: React.FC<BuffIconProps> = ({ itemId, className = '', title }) => {
  const art = BUFF_ART[itemId];
  if (!art) return <BitShard className={className} />;
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {art.rows.flatMap((row, y) => {
        // Runs of one colour become one rect, so a sprite is ~100 nodes, not 256.
        const rects: React.ReactNode[] = [];
        let x = 0;
        while (x < row.length) {
          const c = row[x];
          let end = x + 1;
          while (end < row.length && row[end] === c) end++;
          if (c !== '.' && art.palette[c]) {
            rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height="1" fill={art.palette[c]} />);
          }
          x = end;
        }
        return rects;
      })}
    </svg>
  );
};
