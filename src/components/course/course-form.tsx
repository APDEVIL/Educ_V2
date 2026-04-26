"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(3, "Min 3 characters").max(200),
  description: z.string().optional(),
  thumbnailUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  categoryId: z.string().uuid().optional(),
  isPublished: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface CourseFormProps {
  courseId?: string;
  defaultValues?: Partial<FormValues>;
  onSuccess?: (courseId: string) => void;
}

export function CourseForm({ courseId, defaultValues, onSuccess }: CourseFormProps) {
  const router = useRouter();
  const utils = api.useUtils();

  // ✅ Track thumbnail preview error separately from form state
  const [imgError, setImgError] = useState(false);

  const { data: categories } = api.course.listCategories.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      thumbnailUrl: "",
      isPublished: false,
      ...defaultValues,
    },
  });

  // Watch thumbnailUrl live so preview updates as user types
  const thumbnailUrl = form.watch("thumbnailUrl");
  const isPublished = form.watch("isPublished");

  const create = api.course.create.useMutation({
    onSuccess: (course) => {
      if (!course) { toast.error("Failed to return course data."); return; }
      toast.success("Course created");
      void utils.course.myCourses.invalidate();
      onSuccess?.(course.id);
      router.push(`/teacher/courses/${course.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const update = api.course.update.useMutation({
    onSuccess: (course) => {
      if (!course) { toast.error("Failed to return course data."); return; }
      toast.success("Course updated");
      void utils.course.myCourses.invalidate();
      void utils.course.getById.invalidate({ courseId: course.id });
      onSuccess?.(course.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const payload = {
      ...values,
      thumbnailUrl: values.thumbnailUrl || undefined,
      categoryId: values.categoryId || undefined,
    };
    if (courseId) {
      update.mutate({ courseId, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const isPending = create.isPending || update.isPending;
  const showPreview = !!thumbnailUrl && thumbnailUrl.startsWith("http") && !imgError;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Introduction to Python" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What will students learn in this course?"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Thumbnail URL + live preview */}
        <FormField
          control={form.control}
          name="thumbnailUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/image.jpg"
                  {...field}
                  onChange={(e) => {
                    setImgError(false); // reset error on new input
                    field.onChange(e);
                  }}
                />
              </FormControl>

              {/* ✅ Live thumbnail preview */}
              <div className={cn(
                "relative mt-2 overflow-hidden rounded-lg border bg-muted",
                showPreview ? "aspect-video" : "flex h-24 items-center justify-center",
              )}>
                {showPreview ? (
                  <Image
                    src={thumbnailUrl!}
                    alt="Thumbnail preview"
                    fill
                    className="object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                    <BookOpen className="h-7 w-7" />
                    <span className="text-[10px]">
                      {imgError
                        ? "⚠ URL is not a direct image link — paste a URL ending in .jpg / .png / .webp"
                        : "Preview will appear here"}
                    </span>
                  </div>
                )}
              </div>

              <FormDescription className="text-xs">
                Must be a direct image URL ending in <code>.jpg</code>, <code>.png</code>, or <code>.webp</code> — not a webpage link
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Publish toggle — edit mode only */}
        {courseId && (
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem
                className={cn(
                  "flex items-center justify-between rounded-lg border p-4 transition-colors",
                  // ✅ Visual feedback — border + bg changes when toggled on
                  field.value
                    ? "border-blue-500/40 bg-blue-500/5"
                    : "border-border bg-transparent",
                )}
              >
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2">
                    {field.value
                      ? <Eye className="h-4 w-4 text-blue-500" />
                      : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    Publish course
                    {/* ✅ Inline state label */}
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      field.value
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-muted text-muted-foreground",
                    )}>
                      {field.value ? "ON — visible to students after admin approval" : "OFF — hidden from students"}
                    </span>
                  </FormLabel>
                  <FormDescription className="text-xs">
                    {field.value
                      ? "Students can find and enroll in this course once approved."
                      : "Toggle on and save to submit this course for admin review."}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isPending}
        >
          {isPending
            ? courseId ? "Saving…" : "Creating…"
            : courseId ? "Save changes" : "Create course"}
        </Button>
      </form>
    </Form>
  );
}