import { type BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import { PitterPatterLogo } from "@/components/pitter-patter-logo.js";

import { gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <PitterPatterLogo />,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
