import { cn } from "@/lib/utils";

const avatarPalettes = [
  "bg-muted text-foreground",
  "bg-success-muted text-success",
  "bg-warning-muted text-warning-foreground",
  "bg-foreground text-background",
] as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getPalette(name: string): (typeof avatarPalettes)[number] {
  const hash = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarPalettes[hash % avatarPalettes.length];
}

type CustomerAvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
} as const;

export function CustomerAvatar({ name, size = "md", className }: CustomerAvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl font-semibold ring-1 ring-inset ring-black/5",
        sizeClasses[size],
        getPalette(name),
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export function getCustomerInitials(name: string): string {
  return getInitials(name);
}
