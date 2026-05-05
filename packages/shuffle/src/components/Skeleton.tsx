import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}
export function ShuffleSkeleton({ children }: Props) {
  return (
    <div data-shuffle-wrapper className="shuffle-wrapper">
      <div data-shuffle-skeleton className="shuffle-skeleton shuffle-block row start-1 end-12">
        <div
          data-shuffle-skeleton-bar="1"
          className="shuffle-skeleton-bar shuffle-block start-1 end-1"
        />
        <div
          data-shuffle-skeleton-bar="2"
          className="shuffle-skeleton-bar shuffle-block start-2 end-2"
        />
        <div
          data-shuffle-skeleton-bar="3"
          className="shuffle-skeleton-bar shuffle-block start-3 end-3"
        />
        <div
          data-shuffle-skeleton-bar="4"
          className="shuffle-skeleton-bar shuffle-block start-4 end-4"
        />
        <div
          data-shuffle-skeleton-bar="5"
          className="shuffle-skeleton-bar shuffle-block start-5 end-5"
        />
        <div
          data-shuffle-skeleton-bar="6"
          className="shuffle-skeleton-bar shuffle-block start-6 end-6"
        />
        <div
          data-shuffle-skeleton-bar="7"
          className="shuffle-skeleton-bar shuffle-block start-7 end-7"
        />
        <div
          data-shuffle-skeleton-bar="8"
          className="shuffle-skeleton-bar shuffle-block start-8 end-8"
        />
        <div
          data-shuffle-skeleton-bar="9"
          className="shuffle-skeleton-bar shuffle-block start-9 end-9"
        />
        <div
          data-shuffle-skeleton-bar="10"
          className="shuffle-skeleton-bar shuffle-block start-10 end-10"
        />
        <div
          data-shuffle-skeleton-bar="11"
          className="shuffle-skeleton-bar shuffle-block start-11 end-11"
        />
        <div
          data-shuffle-skeleton-bar="12"
          className="shuffle-skeleton-bar shuffle-block start-12 end-12"
        />
      </div>
      {children}
    </div>
  );
}
