import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}
export function GridSkeleton({ children }: Props) {
  return (
    <div data-pp-grid-wrapper className="grid-wrapper">
      <div data-pp-grid-skeleton className="grid-skeleton pp-shuffle-block row start-1 end-12">
        <div
          data-pp-grid-skeleton-bar="1"
          className="grid-skeleton-bar pp-shuffle-block start-1 end-1"
        />
        <div
          data-pp-grid-skeleton-bar="2"
          className="grid-skeleton-bar pp-shuffle-block start-2 end-2"
        />
        <div
          data-pp-grid-skeleton-bar="3"
          className="grid-skeleton-bar pp-shuffle-block start-3 end-3"
        />
        <div
          data-pp-grid-skeleton-bar="4"
          className="grid-skeleton-bar pp-shuffle-block start-4 end-4"
        />
        <div
          data-pp-grid-skeleton-bar="5"
          className="grid-skeleton-bar pp-shuffle-block start-5 end-5"
        />
        <div
          data-pp-grid-skeleton-bar="6"
          className="grid-skeleton-bar pp-shuffle-block start-6 end-6"
        />
        <div
          data-pp-grid-skeleton-bar="7"
          className="grid-skeleton-bar pp-shuffle-block start-7 end-7"
        />
        <div
          data-pp-grid-skeleton-bar="8"
          className="grid-skeleton-bar pp-shuffle-block start-8 end-8"
        />
        <div
          data-pp-grid-skeleton-bar="9"
          className="grid-skeleton-bar pp-shuffle-block start-9 end-9"
        />
        <div
          data-pp-grid-skeleton-bar="10"
          className="grid-skeleton-bar pp-shuffle-block start-10 end-10"
        />
        <div
          data-pp-grid-skeleton-bar="11"
          className="grid-skeleton-bar pp-shuffle-block start-11 end-11"
        />
        <div
          data-pp-grid-skeleton-bar="12"
          className="grid-skeleton-bar pp-shuffle-block start-12 end-12"
        />
      </div>
      {children}
    </div>
  );
}
