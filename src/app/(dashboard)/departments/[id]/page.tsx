"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDepartment } from "@/lib/api/department-doctor-service";
import { useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export default function DepartmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const allowed = useAuthStore((state) => state.session?.activeTenant?.permissions.includes("department:read") ?? false);
  const query = useQuery({ queryKey: ["department", id], queryFn: () => getDepartment(id), enabled: allowed });
  if (!allowed) return <PageContainer><ErrorState title="You are not authorized to view this department." /></PageContainer>;
  if (query.isLoading) return <PageContainer><LoadingState label="Loading department..." /></PageContainer>;
  if (query.isError || !query.data) return <PageContainer><ErrorState title="Unable to load department." onRetry={() => void query.refetch()} /></PageContainer>;
  const department = query.data;
  return <PageContainer><Button nativeButton={false} variant="ghost" render={<Link href="/departments" />} className="mb-4 -ml-3"><ArrowLeft className="size-4" />Back to departments</Button><PageHeader eyebrow="Department details" title={department.name} description={department.description ?? "No description provided."} /><div className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Status</p><StatusBadge status={department.isActive ? "success" : "neutral"}>{department.isActive ? "Active" : "Inactive"}</StatusBadge><p className="mt-4 text-sm text-muted-foreground">Slug</p><p>{department.slug}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Assigned branches</p><ul className="mt-2 list-disc pl-5 text-sm">{department.branches.map((branch) => <li key={branch.id}>{branch.name} ({branch.branchCode})</li>)}</ul></div></div></PageContainer>;
}
