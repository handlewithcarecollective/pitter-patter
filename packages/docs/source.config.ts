import { type metaSchema, type pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs, type DocsCollection } from "fumadocs-mdx/config";

export const docs: DocsCollection<typeof pageSchema, typeof metaSchema> = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig();
