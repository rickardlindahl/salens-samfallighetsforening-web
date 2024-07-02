import { DocumentsList } from "@/components/documents-list";

import configPromise from "@payload-config";
import { getPayloadHMR } from "@payloadcms/next/utilities";

async function getDocuments(limit?: number) {
  const payload = await getPayloadHMR({ config: configPromise });

  const documents = await payload.find({
    collection: "documents",
    limit,
  });

  return documents.docs;
}

export async function Documents({ limit }: { limit?: number }) {
  const documents = await getDocuments();

  if (documents.length === 0) {
    return (
      <div>
        <h3 className="text-xl font-bold tracking-tight">
          Inga dokument uppladdade ännu
        </h3>
      </div>
    );
  }

  return <DocumentsList documents={documents} />;
}
