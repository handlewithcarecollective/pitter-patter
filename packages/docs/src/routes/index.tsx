import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";

import { PitterPatterLogo } from "@/components/pitter-patter-logo.js";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-col items-center justify-center text-center flex-1">
        <div className="flex flex-col items-start gap-4 max-w-4/5">
          <p>
            by{" "}
            <span className="font-handle text-lg leading-[0.9] font-extralight uppercase md:text-xl">
              Handle with Care
            </span>
          </p>
          <h1 className="font-medium text-6xl mb-4">
            <PitterPatterLogo className="max-w-[80vw]" />
          </h1>
          <p className="text-left">An open source collaborative rich editing toolkit.</p>
          <p className="text-left">Built with React and ProseMirror.</p>
          <Link
            to="/docs/$"
            params={{
              _splat: "introduction/getting-started",
            }}
            className="px-3 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm"
          >
            Get started
          </Link>
        </div>
      </div>
    </HomeLayout>
  );
}
