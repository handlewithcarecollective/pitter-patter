import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}
export function GridSkeleton({ children }: Props) {
  return (
    <div className="grid-wrapper">
      <div className="grid-skeleton pp-org row start-1 end-12">
        <div className="grid-skeleton-bar pp-org start-1 end-1" />
        <div className="grid-skeleton-bar pp-org start-2 end-2" />
        <div className="grid-skeleton-bar pp-org start-3 end-3" />
        <div className="grid-skeleton-bar pp-org start-4 end-4" />
        <div className="grid-skeleton-bar pp-org start-5 end-5" />
        <div className="grid-skeleton-bar pp-org start-6 end-6" />
        <div className="grid-skeleton-bar pp-org start-7 end-7" />
        <div className="grid-skeleton-bar pp-org start-8 end-8" />
        <div className="grid-skeleton-bar pp-org start-9 end-9" />
        <div className="grid-skeleton-bar pp-org start-10 end-10" />
        <div className="grid-skeleton-bar pp-org start-11 end-11" />
        <div className="grid-skeleton-bar pp-org start-12 end-12" />
      </div>
      {children}
    </div>
  );
}
