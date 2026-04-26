"use client";

import { useState } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form"; // Added SubmitHandler
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ─── Schema ───────────────────────────────────────────────────────────────────

const questionSchema = z.object({
  question: z.string().min(1, "Required"),
  options: z.array(z.object({ value: z.string().min(1) })).min(2),
  correctIndex: z.number(),
  // Removed .default() - handle defaults in useForm instead
  points: z.number().min(1), 
});

const formSchema = z.object({
  type: z.enum(["assignment", "quiz", "exam"]),
  title: z.string().min(1, "Title required").max(200),
  description: z.string().optional(),
  // Removed .default()
  maxPoints: z.number().min(1), 
  deadline: z.string().optional(), 
  // Removed .default()
  isAutoGraded: z.boolean(), 
  questions: z.array(questionSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AssessmentFormProps {
  courseId: string;
  onSuccess?: () => void;
}

export function AssessmentForm({ courseId, onSuccess }: AssessmentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // Define ALL fields here to satisfy react-hook-form and fix the TS error
    defaultValues: {
      type: "assignment",
      title: "",
      description: "",
      deadline: "",
      maxPoints: 100,
      isAutoGraded: true,
      questions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const assessmentType = form.watch("type");
  const isQuiz = assessmentType === "quiz" || assessmentType === "exam";

  const utils = api.useUtils();
  const create = api.assessment.create.useMutation({
    onSuccess: () => {
      toast.success("Assessment created");
      void utils.assessment.listForCourse.invalidate({ courseId });
      form.reset();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  // Added SubmitHandler type here
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    create.mutate({
      courseId,
      type: values.type,
      title: values.title,
      description: values.description,
      maxPoints: values.maxPoints,
      deadline: values.deadline ? new Date(values.deadline) : undefined,
      isAutoGraded: values.isAutoGraded,
      questions: isQuiz
        ? values.questions?.map((q) => ({
            question: q.question,
            options: q.options.map((o) => o.value),
            correctIndex: q.correctIndex,
            points: q.points,
          }))
        : undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Week 3 Assignment" {...field} />
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
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what students need to do..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Points + Deadline */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxPoints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max points</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deadline</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Quiz builder */}
        {isQuiz && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Questions</h3>
              <FormField
                control={form.control}
                name="isAutoGraded"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="text-xs text-muted-foreground">
                      Auto-grade
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              {fields.map((field, qi) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Q{qi + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => remove(qi)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`questions.${qi}.question`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Question text" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Options */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Options — select the correct answer
                    </Label>
                    <FormField
                      control={form.control}
                      name={`questions.${qi}.correctIndex`}
                      render={({ field: radioField }) => (
                        <RadioGroup
                          value={String(radioField.value)}
                          onValueChange={(v) => radioField.onChange(Number(v))}
                        >
                          {[0, 1, 2, 3].map((oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <RadioGroupItem value={String(oi)} id={`q${qi}-o${oi}`} />
                              <FormField
                                control={form.control}
                                name={`questions.${qi}.options.${oi}.value`}
                                render={({ field }) => (
                                  <Input
                                    placeholder={`Option ${oi + 1}`}
                                    className="h-8 text-sm"
                                    {...field}
                                  />
                                )}
                              />
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    />
                  </div>

                  {/* Points per question */}
                  <FormField
                    control={form.control}
                    name={`questions.${qi}.points`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormLabel className="text-xs text-muted-foreground whitespace-nowrap">
                          Points
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-20 text-sm"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() =>
                  append({
                    question: "",
                    options: [
                      { value: "" },
                      { value: "" },
                      { value: "" },
                      { value: "" },
                    ],
                    correctIndex: 0,
                    points: 1,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add question
              </Button>
            </div>
          </>
        )}

        <Button type="submit" className="w-full" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create assessment"}
        </Button>
      </form>
    </Form>
  );
}