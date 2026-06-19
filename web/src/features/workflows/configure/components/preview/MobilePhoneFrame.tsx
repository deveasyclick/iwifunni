import type { ReactNode } from 'react';

interface MobilePhoneFrameProps {
  readonly children: ReactNode;
}

/** Wraps content in a mobile phone-like container with notch and home bar. */
export const MobilePhoneFrame = ({ children }: MobilePhoneFrameProps) => (
  <div className="mx-auto max-w-[375px]">
    <div className="overflow-hidden rounded-[44px] border-[3px] border-border/60 bg-dark shadow-xl">
      <div className="relative flex justify-center pt-3">
        <div className="h-5 w-28 rounded-b-xl bg-black" />
      </div>
      <div className="px-2 pb-2 pt-2">{children}</div>
      <div className="flex justify-center pb-3">
        <div className="h-1 w-32 rounded-full bg-white/30" />
      </div>
    </div>
  </div>
);
