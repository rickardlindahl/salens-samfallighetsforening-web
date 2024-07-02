import { PostsList } from "@/components/posts-list";
import configPromise from "@payload-config";
import { getPayloadHMR } from "@payloadcms/next/utilities";

async function getPosts(limit?: number) {
  const payload = await getPayloadHMR({ config: configPromise });
  const posts = await payload.find({
    collection: "posts",
    limit,
  });

  return posts.docs;
}

export async function Posts({ limit }: { limit?: number }) {
  const posts = await getPosts(limit);

  if (posts.length === 0) {
    return (
      <div>
        <h3 className="text-2xl font-bold tracking-tight">
          Inga inlägg skapade ännu
        </h3>
      </div>
    );
  }

  return <PostsList posts={posts} />;
}
