import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Image from "next/image";
import { renderMarkdown } from "@/lib/markdown";
import { brandedImage, pageMetadata } from "@/lib/seo";
import { sectionPages } from "@/lib/pages";
import { siteConfig } from "@/lib/site";

const page = sectionPages.about;

export const metadata: Metadata = pageMetadata({
  title: page.title,
  socialTitle: `${page.title} | ${siteConfig.name}`,
  description: page.description,
  path: page.path,
  image: brandedImage("about", page.title),
});

export default async function AboutPage() {
  const aboutPath = path.join(process.cwd(), "content", "about.md");
  const content = fs.existsSync(aboutPath) ? fs.readFileSync(aboutPath, "utf-8") : "";
  const html = await renderMarkdown(content);

  const photoPath = path.join(process.cwd(), "public", "images", "chinomso-okere.jpg");
  const hasPhoto = fs.existsSync(photoPath);

  return (
    <div className="site-container">
      <div className="page-col">
        <article className="article article--page">
          <h1 className="page-title">About</h1>

          {hasPhoto && (
            <div className="mb-8">
              <Image
                src="/images/chinomso-okere.jpg"
                alt="Photo of Chinomso Okere"
                width={128}
                height={128}
                className="w-[128px] h-[128px] rounded-[10px] border border-[var(--border)] object-cover"
                priority
              />
            </div>
          )}

          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
    </div>
  );
}

