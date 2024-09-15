import escapeHTML from "escape-html";
import type {
  SerializedHeadingNode,
  SerializedLinkNode,
  SerializedListItemNode,
  SerializedListNode,
  SerializedTextNode,
  SerializedUploadNode,
} from "@payloadcms/richtext-lexical";

import {
  type SerializedLexicalNode,
  IS_BOLD,
  IS_CODE,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_SUBSCRIPT,
  IS_SUPERSCRIPT,
  IS_UNDERLINE,
  type SerializedParagraphNode,
} from "lexical";
import type { Document as DocumentCollection } from "@payload-types";
import { Icons } from "../icons";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";

function getLinkForPage(_doc: unknown) {
  return "implement this";
}

export function render(children: SerializedLexicalNode[]) {
  return children
    .filter(Boolean)
    .map<React.ReactNode>((node) => {
      if (node.type === "text") {
        const textNode = node as SerializedTextNode;
        const text = `${escapeHTML(textNode.text)}`;

        if (textNode.format & IS_BOLD) {
          return <strong>${text}</strong>;
        }

        if (textNode.format & IS_ITALIC) {
          return <em>${text}</em>;
        }

        if (textNode.format & IS_STRIKETHROUGH) {
          return <span className="line-through">${text}</span>;
        }

        if (textNode.format & IS_UNDERLINE) {
          return <span className="underline">${text}</span>;
        }

        if (textNode.format & IS_CODE) {
          return <code>${text}</code>;
        }

        if (textNode.format & IS_SUBSCRIPT) {
          return <sub>${text}</sub>;
        }

        if (textNode.format & IS_SUPERSCRIPT) {
          return <sup>${text}</sup>;
        }

        return text;
      }

      switch (node.type) {
        case "linebreak": {
          return <br />;
        }
        case "link": {
          const linkNode = node as SerializedLinkNode;

          const attributes = linkNode.fields;

          if (linkNode.fields.linkType === "custom") {
            return (
              <a
                href={attributes.url}
                target={attributes.newTab ? "_blank" : undefined}
              >
                {render(linkNode.children)}
              </a>
            );
          }

          return (
            <a
              href={getLinkForPage(attributes.doc)}
              target={attributes.newTab ? "_blank" : undefined}
            >
              {render(linkNode.children)}
            </a>
          );
        }
        case "list": {
          const listNode = node as SerializedListNode;
          if (listNode.listType === "bullet") {
            return (
              <ul className="list-disc mb-4 pl-8">
                {render(listNode.children)}
              </ul>
            );
          }
          return (
            <ol className="list-disc mb-4 pl-8">{render(listNode.children)}</ol>
          );
        }
        case "listitem": {
          const listItemNode = node as SerializedListItemNode;
          return <li>{render(listItemNode.children)}</li>;
        }
        case "heading": {
          const headingNode = node as SerializedHeadingNode;
          const Component = headingNode.tag;
          return <Component>{render(headingNode.children)}</Component>;
        }
        case "paragraph": {
          const paragraphNode = node as SerializedParagraphNode;
          return <p>{render(paragraphNode.children)}</p>;
        }
        case "upload": {
          const uploadNode = node as SerializedUploadNode;
          if (uploadNode.relationTo === "documents") {
            const values = uploadNode.value as DocumentCollection;
            return values.url ? (
              <a
                download
                href={values.url}
                className={cn(
                  "flex flex-row gap-2 items-center",
                  buttonVariants({ variant: "link" }),
                )}
              >
                <Icons.download className="w-4 h-4" />

                <span>{values.filename}</span>
              </a>
            ) : null;
          }

          return null;
        }
        default: {
          console.log("Default rendering node", node);
          return null;
        }
      }
    })
    .filter((node) => node !== null);
}
