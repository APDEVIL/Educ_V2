import { FileText, Download } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface MessageBubbleProps {
  id: string;
  body?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  type: "text" | "file";
  createdAt: Date | string;
  sender: { id: string; name: string; image?: string | null };
  isMine: boolean;
}

export function MessageBubble({
  body,
  fileUrl,
  fileName,
  type,
  createdAt,
  sender,
  isMine,
}: MessageBubbleProps) {
  return (
    <div className={cn("flex items-end gap-2", isMine && "flex-row-reverse")}>
      {/* Avatar — only show for other person */}
      {!isMine && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={sender.image ?? ""} />
          <AvatarFallback className="text-[10px]">
            {getInitials(sender.name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "flex max-w-[72%] flex-col gap-1",
          isMine && "items-end",
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm",
            isMine
              ? "rounded-br-sm bg-blue-600 text-white"
              : "rounded-bl-sm bg-muted text-foreground",
          )}
        >
          {type === "text" && <p className="whitespace-pre-wrap break-words">{body}</p>}

          {type === "file" && fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5 transition-colors",
                isMine
                  ? "border-blue-400/40 hover:bg-blue-500"
                  : "border-border hover:bg-accent",
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-xs font-medium">
                {fileName ?? "File"}
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
            </a>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(createdAt)}
        </span>
      </div>
    </div>
  );
}