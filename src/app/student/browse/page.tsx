"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { CourseCard } from "@/components/course/coruse-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

export default function BrowsePage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const { data: categories } = api.course.listCategories.useQuery();
  const { data: courses, isLoading } = api.course.list.useQuery({
    search: search || undefined,
    categoryId: categoryId ?? undefined,
    limit: 24,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Browse courses"
        description="Discover and enroll in courses"
        crumbs={[{ label: "Browse" }]}
      />

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={categoryId ?? "all"}
          onValueChange={(v) => setCategoryId(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || categoryId) && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => { setSearch(""); setCategoryId(null); }}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters */}
      {categoryId && (
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1">
            {categories?.find((c) => c.id === categoryId)?.name}
            <button onClick={() => setCategoryId(null)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
        </div>
      ) : courses?.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium">No courses found</p>
          <p className="text-sm text-muted-foreground">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses?.map((c) => (
            <CourseCard
              key={c.id}
              id={c.id}
              title={c.title}
              description={c.description}
              thumbnailUrl={c.thumbnailUrl}
              teacher={c.teacher}
              category={c.category}
              variant="browse"
            />
          ))}
        </div>
      )}
    </div>
  );
}