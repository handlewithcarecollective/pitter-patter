/** @type {import('typedoc').TypeDocOptions & import('typedoc-plugin-markdown').PluginOptions} */
const config = {
  entryPoints: ["./src/index.ts", "./src/react.ts"],
  plugin: [
    "typedoc-plugin-markdown",
    "typedoc-plugin-frontmatter",
    "./typedoc-plugin-frontmatter.mjs",
  ],
  out: "../docs/content/docs/presence/reference/presence-client",
  readme: "none",
  cleanOutputDir: true,
  hideBreadcrumbs: true,
  hidePageHeader: true,
  useCodeBlocks: true,
  expandObjects: true,
  expandParameters: true,
  publicPath: "/docs/presence/reference/presence-client",
};

export default config;
