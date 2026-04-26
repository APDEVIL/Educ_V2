"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MoreHorizontal, ShieldBan, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { getInitials, formatDate } from "@/lib/utils";
import { useDebounce } from "@/lib/use-debounce";

type Role = "admin" | "teacher" | "student";

const roleColors: Record<Role, string> = {
  admin:   "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  teacher: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  student: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [banTarget, setBanTarget] = useState<{ id: string; name: string; banned: boolean } | null>(null);

  const debouncedSearch = search; // use useDebounce hook if you want 300ms delay

  const utils = api.useUtils();

  const { data, isLoading } = api.user.list.useQuery({
    search: debouncedSearch || undefined,
    role: role === "all" ? undefined : role,
    limit: 50,
  });

  const updateRole = api.user.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      void utils.user.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleBan = api.user.toggleBan.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.banned ? "User banned" : "User unbanned");
      setBanTarget(null);
      void utils.user.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Users"
        description="Manage all platform users"
        crumbs={[{ label: "Admin" }, { label: "Users" }]}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as Role | "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              : data?.map((user) => {
                  const userRole = (user.role ?? "student") as Role;
                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image ?? ""} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${roleColors[userRole]}`}>
                          {userRole}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.banned ? "destructive" : "secondary"} className="text-xs">
                          {user.banned ? "Banned" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateRole.mutate({ userId: user.id, role: "student" })}
                            >
                              <UserCog className="mr-2 h-4 w-4" /> Set Student
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateRole.mutate({ userId: user.id, role: "teacher" })}
                            >
                              <UserCog className="mr-2 h-4 w-4" /> Set Teacher
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setBanTarget({ id: user.id, name: user.name, banned: !user.banned })
                              }
                            >
                              {user.banned
                                ? <><ShieldCheck className="mr-2 h-4 w-4" />Unban</>
                                : <><ShieldBan className="mr-2 h-4 w-4" />Ban</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {/* Ban confirm dialog */}
      <AlertDialog open={!!banTarget} onOpenChange={() => setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banTarget?.banned ? "Ban" : "Unban"} {banTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banTarget?.banned
                ? "This user will lose access to the platform immediately."
                : "This user will regain access to the platform."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                banTarget &&
                toggleBan.mutate({ userId: banTarget.id, banned: banTarget.banned })
              }
            >
              {banTarget?.banned ? "Ban user" : "Unban user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}