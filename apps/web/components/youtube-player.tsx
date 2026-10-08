"use client";

import Image from "next/image";
import { useState } from "react";

// Shows the thumbnail with a play button and only loads YouTube's player
// (~1MB of script, plus cookies) once the visitor actually clicks play.
export function YouTubePlayer({ id, title, thumbnail }: { id: string; title: string; thumbnail?: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 shadow-sm ring-1 ring-slate-200">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`} className="group absolute inset-0 h-full w-full">
          <Image
            src={thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 896px) 896px, 100vw"
            className="object-cover"
            unoptimized={!thumbnail} // remote YouTube thumbnail isn't in next.config images.remotePatterns
          />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-red-600 shadow-lg transition-transform group-hover:scale-110 group-focus-visible:scale-110">
            <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-white" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
