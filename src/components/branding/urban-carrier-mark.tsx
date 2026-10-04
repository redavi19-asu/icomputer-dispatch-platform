import Link from "next/link";
import { URBAN_CARRIER_ICON_DATA_URI } from "@/lib/urban-carrier-brand";

type UrbanCarrierMarkProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "h-9 w-9 rounded-xl",
  md: "h-12 w-12 rounded-2xl",
  lg: "h-20 w-20 rounded-[1.6rem]",
};

export function UrbanCarrierMark({
  href = "/",
  size = "md",
  showText = false,
  className = "",
}: UrbanCarrierMarkProps) {
  const mark = (
    <span className={"inline-flex items-center gap-3 " + className}>
      <span className={`${sizeClasses[size]} overflow-hidden border border-white/35 bg-white p-0.5 shadow-lg`}>
        <img
          src={URBAN_CARRIER_ICON_DATA_URI}
          alt="Urban Carrier OS"
          className="h-full w-full rounded-[inherit] object-cover"
        />
      </span>
      {showText ? (
        <span className="leading-tight">
          <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-sky-200/70">
            I Computer Anything
          </span>
          <span className="block font-black text-white">Urban Carrier OS</span>
        </span>
      ) : null}
    </span>
  );

  return href ? <Link href={href}>{mark}</Link> : mark;
}
