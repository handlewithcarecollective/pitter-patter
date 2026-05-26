/** @type {import('typedoc').TypeDocOptions & import('typedoc-plugin-markdown').PluginOptions} */
const config = {
  entryPoints: ["./src/index.ts"],
  plugin: [
    "typedoc-plugin-markdown",
    "typedoc-plugin-frontmatter",
    "./typedoc-plugin-frontmatter.mjs",
  ],
  out: "../docs/content/docs/shuffle/reference",
  readme: "none",
  cleanOutputDir: true,
  hideBreadcrumbs: true,
  hidePageHeader: true,
  useCodeBlocks: true,
  expandObjects: true,
  expandParameters: true,
};

export default config;
