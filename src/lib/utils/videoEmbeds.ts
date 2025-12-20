/**
 * Video Embed Utilities
 * Helper functions for converting video URLs to embeddable formats
 */

/**
 * Convert a YouTube URL to an embed URL
 */
export function getYouTubeEmbedUrl(url: string): string {
  const videoId = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  )?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

/**
 * Convert a Vimeo URL to an embed URL
 */
export function getVimeoEmbedUrl(url: string): string {
  const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
  return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
}

/**
 * Detect video type from URL
 */
export function detectVideoType(url: string): 'youtube' | 'vimeo' | undefined {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  } else if (url.includes('vimeo.com')) {
    return 'vimeo';
  }
  return undefined;
}
