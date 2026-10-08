import { JsonLd } from "@/components/json-ld";
import { YouTubePlayer } from "@/components/youtube-player";
import { SITE_URL, type YouTubeVideo as Video } from "@/lib/site";

// Embeds a YouTube video together with its VideoObject structured data, so
// search engines and AI answers can index the video against this page.
// The player itself loads only on click (see YouTubePlayer).
export function YouTubeVideo({ video }: { video: Video }) {
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;
  return (
    <figure>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: video.title,
          description: video.description,
          thumbnailUrl: [...(video.thumbnail ? [`${SITE_URL}${video.thumbnail}`] : []), `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`],
          uploadDate: video.uploadDate,
          duration: video.duration,
          contentUrl: watchUrl,
          embedUrl: `https://www.youtube.com/embed/${video.id}`,
        }}
      />
      <YouTubePlayer id={video.id} title={video.title} thumbnail={video.thumbnail} />
      <figcaption className="mt-3 text-sm text-slate-600">
        {video.description}{" "}
        <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:underline">
          Watch on YouTube
        </a>
      </figcaption>
    </figure>
  );
}
