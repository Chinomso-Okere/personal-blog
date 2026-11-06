import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";
import { PostRow } from "@/components/PostRow";
import { brandedImage, pageMetadata } from "@/lib/seo";
import { sectionPages } from "@/lib/pages";
import { siteConfig } from "@/lib/site";

const page = sectionPages.blog;

export const metadata: Metadata = pageMetadata({
  title: page.title,
  socialTitle: `${page.title} | ${siteConfig.name}`,
  description: page.description,
  path: page.path,
  image: brandedImage("blog", page.title),
});

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="site-container">
      <div className="page-col">
        <header className="page-head">
          <h1 className="page-title">Blog</h1>
          <p className="page-intro">
            Long-form technical articles, evaluations, and architecture notes.
          </p>
          <p className="page-count">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
        </header>

        <div className="post-list">
          {posts.map((post) => (
            <PostRow key={post.slug} post={post} headingLevel="h2" />
          ))}
        </div>
      </div>
    </div>
  );
}

