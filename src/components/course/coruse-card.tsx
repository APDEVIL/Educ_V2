"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { BookOpen, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials, truncate } from "@/lib/utils";

interface CourseCardProps {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  teacher: { name: string; image?: string | null };
  category?: { name: string } | null;
  status?: "draft" | "pending" | "approved" | "rejected";
  enrolledCount?: number;
  progressPercent?: number;
  href?: string;
  variant?: "browse" | "enrolled" | "manage";
}

const statusStyles = {
  draft:    "bg-muted text-muted-foreground",
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function CourseCard({
  id,
  title,
  description,
  thumbnailUrl,
  teacher,
  category,
  status,
  enrolledCount,
  progressPercent,
  href,
  variant = "browse",
}: CourseCardProps) {
  // ✅ Track if the image failed to load (broken URL, 403, CORS, etc.)
  const [imgError, setImgError] = useState(false);

  const linkHref =
    href ??
    (variant === "enrolled"
      ? `/learn/${id}`
      : variant === "manage"
        ? `/teacher/courses/${id}`
        : `/browse/${id}`);

  const showImage = !!thumbnailUrl && !imgError;

  return (
    <Link
      href={linkHref}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {showImage ? (
          <Image
            src={thumbnailUrl!}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)} // ✅ Fallback on 403, broken URL, etc.
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Status badge — manage variant only */}
        {status && variant === "manage" && (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-medium",
              statusStyles[status],
            )}
          >
            {status}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {category && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {category.name}
          </span>
        )}

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {title}
        </h3>

        {description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {truncate(description, 120)}
          </p>
        )}

        {/* Teacher */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={teacher.image ?? ""} />
            <AvatarFallback className="text-[9px]">
              {getInitials(teacher.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{teacher.name}</span>

          {enrolledCount !== undefined && (
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {enrolledCount}
            </span>
          )}
        </div>

        {/* Progress bar — enrolled variant */}
        {variant === "enrolled" && progressPercent !== undefined && (
          <div className="flex flex-col gap-1 pt-1">
            <Progress value={progressPercent} className="h-1.5" />
            <span className="text-[10px] text-muted-foreground">
              {Math.round(progressPercent)}% complete
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}