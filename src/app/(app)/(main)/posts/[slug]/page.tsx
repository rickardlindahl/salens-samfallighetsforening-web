import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";
import { getPayloadHMR } from "@payloadcms/next/utilities";
import configPromise from "@payload-config";

async function getPost(slug: string) {
  const payload = await getPayloadHMR({ config: configPromise });
  const posts = await payload.find({
    collection: "posts",
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
  });

  console.log(posts);

  return posts.docs;
}

export default async function SpecificPostPage({
  params,
}: { params: { slug: string } }) {
  const [post] = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="container max-w-6xl py-6 lg:py-10">
      <article className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8">
        <div className="flex-1 space-y-4">
          <h1 className="inline-block font-semibold text-4xl tracking-tight lg:text-5xl">
            {post.title}
          </h1>
          <hr className="my-8" />
          <p className="text-sm text-muted-foreground">
            {/*
               *
               *
            <time dateTime={post.postPublishDate.toISOString()}>
                {formatRelative(post.postPublishDate)}
              </time>
               */}
          </p>
        </div>
      </article>
    </div>
  );
}
