"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDoctor } from "@/lib/api/department-doctor-service";
import { useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export default function DoctorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const allowed = useAuthStore((state) => state.session?.activeTenant?.permissions.includes("doctor:read") ?? false);
  const query = useQuery({ queryKey: ["doctor", id], queryFn: () => getDoctor(id), enabled: allowed });
  if (!allowed) return <PageContainer><ErrorState title="You are not authorized to view this doctor." /></PageContainer>;
  if (query.isLoading) return <PageContainer><LoadingState label="Loading doctor..." /></PageContainer>;
  if (query.isError || !query.data) return <PageContainer><ErrorState title="Unable to load doctor." onRetry={() => void query.refetch()} /></PageContainer>;
  const doctor = query.data;
  return <PageContainer><Button nativeButton={false} variant="ghost" render={<Link href="/doctors" />} className="mb-4 -ml-3"><ArrowLeft className="size-4" />Back to doctors</Button><PageHeader eyebrow="Doctor details" title={doctor.user.fullName} description={`${doctor.specialization ?? "Doctor"} · ${doctor.doctorCode}`} /><div className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-xl border bg-card p-5"><div className="flex justify-between"><p className="font-medium">{doctor.user.email}</p><StatusBadge status={doctor.isActive ? "success" : "neutral"}>{doctor.isActive ? "Active" : "Inactive"}</StatusBadge></div><p className="mt-3 text-sm text-muted-foreground">{doctor.qualification ?? "Qualification not provided"} · {doctor.experienceYears ?? "—"} years experience</p><p className="mt-4 text-sm">{doctor.biography ?? "No biography provided."}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Departments</p><p className="mt-1">{doctor.departments.map((item) => item.name).join(", ") || "None assigned"}</p><p className="mt-4 text-sm text-muted-foreground">Branches and consultation fees</p><ul className="mt-1 space-y-1 text-sm">{doctor.branches.map((item) => <li key={item.id}>{item.branchName}: {item.consultationFee} {item.currency}</li>)}</ul></div></div></PageContainer>;
}
