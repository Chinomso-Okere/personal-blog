import Image from "next/image";
import { getLocalImageSize } from "@/lib/image-size";

interface CoverImageProps {
  src: string;
  alt: string;
  sizes: string;
}

// The LCP image on home and post pages. Local /images/ files go through
// next/image (responsive, modern formats, preloaded); https covers stay a plain
// <img> so no remotePatterns config is needed and an external cover can't break.
export function CoverImage({ src, alt, sizes }: CoverImageProps) {
  const size = getLocalImageSize(src);

  if (size) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size.width}
        height={size.height}
        sizes={sizes}
        // Covers here are diagrams with small text, which softens at the
        // default quality of 75.
        quality={90}
        preload
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} fetchPriority="high" decoding="async" />
  );
}
