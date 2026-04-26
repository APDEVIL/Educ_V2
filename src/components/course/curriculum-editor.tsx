"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Plus, Trash2, ChevronDown, ChevronRight,
  FileText, Video, Link2, File, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentType = "pdf" | "video" | "doc" | "link";

interface LessonItem {
  id: string;
  title: string;
  order: number;
  durationMinutes?: number | null;
  contents: { id: string; type: ContentType; title: string; url: string }[];
}

interface ModuleItem {
  id: string;
  title: string;
  order: number;
  lessons: LessonItem[];
}

// ─── Content type icon ────────────────────────────────────────────────────────

const contentIcons: Record<ContentType, React.ElementType> = {
  pdf: FileText,
  video: Video,
  link: Link2,
  doc: File,
};

// ─── Sortable lesson row ──────────────────────────────────────────────────────

function SortableLesson({
  lesson,
  moduleId,
  courseId,
}: {
  lesson: LessonItem;
  moduleId: string;
  courseId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  const [addContent, setAddContent] = useState(false);
  const [contentType, setContentType] = useState<ContentType>("pdf");
  const [contentTitle, setContentTitle] = useState("");
  const [contentUrl, setContentUrl] = useState("");

  const utils = api.useUtils();

  const deleteLesson = api.course.deleteLesson.useMutation({
    onSuccess: () => {
      toast.success("Lesson deleted");
      void utils.course.getById.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const addContentMut = api.course.addContent.useMutation({
    onSuccess: () => {
      toast.success("Content added");
      setContentTitle("");
      setContentUrl("");
      setAddContent(false);
      void utils.course.getById.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-lg border bg-background",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex-1 text-sm">{lesson.title}</span>
        {lesson.durationMinutes && (
          <span className="text-[11px] text-muted-foreground">{lesson.durationMinutes}m</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setAddContent((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => deleteLesson.mutate({ lessonId: lesson.id })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content list */}
      {lesson.contents.length > 0 && (
        <div className="border-t px-3 py-2 space-y-1.5">
          {lesson.contents.map((c) => {
            const Icon = contentIcons[c.type];
            return (
              <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.title}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">{c.type}</Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Add content inline form */}
      {addContent && (
        <div className="border-t p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="doc">Doc</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Title"
              className="col-span-2 h-8 text-xs"
              value={contentTitle}
              onChange={(e) => setContentTitle(e.target.value)}
            />
          </div>
          <Input
            placeholder="URL"
            className="h-8 text-xs"
            value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs bg-blue-600 hover:bg-blue-700"
              disabled={!contentTitle || !contentUrl || addContentMut.isPending}
              onClick={() =>
                addContentMut.mutate({
                  lessonId: lesson.id,
                  type: contentType,
                  title: contentTitle,
                  url: contentUrl,
                })
              }
            >
              {addContentMut.isPending ? "Adding…" : "Add"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setAddContent(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module section ───────────────────────────────────────────────────────────

function ModuleSection({
  module,
  courseId,
}: {
  module: ModuleItem;
  courseId: string;
}) {
  const [open, setOpen] = useState(true);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [addingLesson, setAddingLesson] = useState(false);

  const utils = api.useUtils();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const deleteMod = api.course.deleteModule.useMutation({
    onSuccess: () => {
      toast.success("Module deleted");
      void utils.course.getById.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  const createLesson = api.course.createLesson.useMutation({
    onSuccess: () => {
      toast.success("Lesson added");
      setNewLessonTitle("");
      setAddingLesson(false);
      void utils.course.getById.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  // Lesson reorder (optimistic — just UI, persist order via updateLesson)
  const updateLesson = api.course.updateLesson.useMutation();

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = module.lessons.findIndex((l) => l.id === active.id);
    const newIndex = module.lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Persist the new order
    updateLesson.mutate({ lessonId: String(active.id), order: newIndex });
  }

  return (
    <div className="rounded-xl border bg-muted/30">
      {/* Module header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground">
          {open
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="flex-1 text-sm font-medium">{module.title}</span>
        <span className="text-xs text-muted-foreground">
          {module.lessons.length} lesson{module.lessons.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setAddingLesson((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => deleteMod.mutate({ moduleId: module.id })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Lessons */}
      {open && (
        <div className="border-t px-4 py-3 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleLessonDragEnd}
          >
            <SortableContext
              items={module.lessons.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {module.lessons.map((lesson) => (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  moduleId={module.id}
                  courseId={courseId}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add lesson inline */}
          {addingLesson && (
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Lesson title"
                className="h-8 text-sm"
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newLessonTitle.trim()) {
                    createLesson.mutate({
                      moduleId: module.id,
                      title: newLessonTitle.trim(),
                      order: module.lessons.length,
                    });
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-8 shrink-0 bg-blue-600 hover:bg-blue-700"
                disabled={!newLessonTitle.trim() || createLesson.isPending}
                onClick={() =>
                  createLesson.mutate({
                    moduleId: module.id,
                    title: newLessonTitle.trim(),
                    order: module.lessons.length,
                  })
                }
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => setAddingLesson(false)}
              >
                Cancel
              </Button>
            </div>
          )}

          {module.lessons.length === 0 && !addingLesson && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No lessons yet — click + to add one
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main curriculum editor ───────────────────────────────────────────────────

interface CurriculumEditorProps {
  courseId: string;
  modules: ModuleItem[];
}

export function CurriculumEditor({ courseId, modules }: CurriculumEditorProps) {
  const [newModTitle, setNewModTitle] = useState("");
  const utils = api.useUtils();

  const createModule = api.course.createModule.useMutation({
    onSuccess: () => {
      toast.success("Module created");
      setNewModTitle("");
      void utils.course.getById.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-3">
      {modules.length === 0 && (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          No modules yet. Add your first module below.
        </p>
      )}

      {modules.map((mod) => (
        <ModuleSection key={mod.id} module={mod} courseId={courseId} />
      ))}

      {/* Add module */}
      <div className="flex gap-2">
        <Input
          placeholder="New module title…"
          className="h-9"
          value={newModTitle}
          onChange={(e) => setNewModTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newModTitle.trim()) {
              createModule.mutate({
                courseId,
                title: newModTitle.trim(),
                order: modules.length,
              });
            }
          }}
        />
        <Button
          className="h-9 shrink-0 gap-1.5 bg-blue-600 hover:bg-blue-700"
          disabled={!newModTitle.trim() || createModule.isPending}
          onClick={() =>
            createModule.mutate({
              courseId,
              title: newModTitle.trim(),
              order: modules.length,
            })
          }
        >
          <Plus className="h-4 w-4" />
          Add module
        </Button>
      </div>
    </div>
  );
}