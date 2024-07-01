import { getPayloadHMR } from "@payloadcms/next/utilities";
import configPromise from "@payload-config";
import Link from "next/link";

async function getPosts() {
  const payload = await getPayloadHMR({ config: configPromise });
  const posts = await payload.find({
    collection: "posts",
  });

  return posts.docs;
}

export async function PostsWrapper() {
  const posts = await getPosts();

  if (posts.length === 0) {
    return (
      <div>
        <h3 className="text-2xl font-bold tracking-tight">
          Inga inlägg skapade ännu
        </h3>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      {posts.map((post) => (
        <Link key={post.id} href={`/posts/${post.slug}`}>
          <article className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div className="grid gap-1">
              <h2 className="text-xl font-medium">{post.title}</h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {post.createdAt}
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}
