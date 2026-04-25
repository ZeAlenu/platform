import { cn } from "@/lib/utils";

interface ResearcherAvatarProps {
  displayName: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ResearcherAvatarProps["size"]>, string> = {
  sm: "size-10 text-sm",
  md: "size-14 text-base",
  lg: "size-24 text-2xl",
};

/** First grapheme of displayName, suitable for Hebrew or Latin names. */
function firstGrapheme(name: string): string {
  if (!name) return "";
  const segmenter =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter("he", { granularity: "grapheme" })
      : null;
  if (segmenter) {
    const first = segmenter.segment(name)[Symbol.iterator]().next().value;
    return first?.segment ?? name.charAt(0);
  }
  return name.charAt(0);
}

export function ResearcherAvatar({
  displayName,
  photoUrl,
  size = "md",
  className,
}: ResearcherAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const fallback = firstGrapheme(displayName);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground font-serif",
        sizeClass,
        className,
      )}
      aria-hidden={photoUrl ? "true" : undefined}
    >
      {photoUrl ? (
        // Plain <img> avoids next/image config for now; can swap later.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={displayName}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span aria-hidden>{fallback}</span>
      )}
    </div>
  );
}
