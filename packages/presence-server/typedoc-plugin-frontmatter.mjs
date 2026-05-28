import { MarkdownPageEvent } from "typedoc-plugin-markdown";

/**
 * @param {import('typedoc-plugin-markdown').MarkdownApplication} app
 */
export function load(app) {
  app.renderer.on(
    MarkdownPageEvent.BEGIN,
    /** @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page */
    (page) => {
      page.frontmatter = {
        title: page.model?.name,
      };
    },
  );

  app.renderer.on(
    MarkdownPageEvent.END,
    /** @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page */
    (page) => {
      page.contents = page.contents.replace(/(\[.*?\]\(.*?)\.md(\))/g, "$1$2");
    },
  );
}
