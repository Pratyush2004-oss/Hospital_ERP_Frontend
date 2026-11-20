"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, MoreHorizontal, Moon, Plus, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable } from "./data-table";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { FormField } from "./form-field";
import { PageContainer } from "./page-container";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const demoFormSchema = z.object({
  facilityName: z.string().min(2, "Enter at least 2 characters."),
});

type DemoRow = { name: string; department: string; status: "Active" | "Pending" };

const demoRows: DemoRow[] = [
  { name: "Riverside Clinic", department: "Outpatient", status: "Active" },
  { name: "North Wing", department: "Cardiology", status: "Pending" },
  { name: "Lakeside Center", department: "Emergency", status: "Active" },
];

export function DesignSystemShowcase() {
  const { resolvedTheme, setTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<z.infer<typeof demoFormSchema>>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: { facilityName: "" },
  });

  const columns = [
    { accessorKey: "name", header: "Facility", enableSorting: true },
    { accessorKey: "department", header: "Department", enableSorting: true },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: { original: DemoRow } }) => (
        <StatusBadge status={row.original.status === "Active" ? "success" : "warning"}>{row.original.status}</StatusBadge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Facility actions" />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast("Edit action selected")}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast("Archive action selected")}>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Development-only showcase"
        title="HospitalOS design system"
        description="A healthcare SaaS foundation for clear, calm, accessible workflows."
        actions={
          <Button variant="outline" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            Theme
          </Button>
        }
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Actions and feedback</h2>
        <div className="flex flex-wrap gap-2">
          <Button><Plus />Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline" onClick={() => toast.success("Saved successfully.")}><Check />Toast</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog foundation</DialogTitle>
                <DialogDescription>Use dialogs for focused, interruptive tasks.</DialogDescription>
              </DialogHeader>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Alert><AlertTitle>Information</AlertTitle><AlertDescription>Keep operational context close to the action.</AlertDescription></Alert>
          <Alert variant="destructive"><AlertTitle>Attention needed</AlertTitle><AlertDescription>Errors are explicit and actionable.</AlertDescription></Alert>
          <div className="rounded-lg border p-4"><div className="mb-2 flex justify-between text-sm"><span>Capacity</span><span>72%</span></div><Progress value={72} /></div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Forms, cards and statuses</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Accessible form pattern</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={form.handleSubmit(() => toast.success("Form submitted."))}>
                <FormField id="facilityName" label="Facility name" required error={form.formState.errors.facilityName?.message}>
                  <Input id="facilityName" aria-invalid={Boolean(form.formState.errors.facilityName)} {...form.register("facilityName")} placeholder="Enter a facility name" />
                </FormField>
                <Button type="submit" disabled={form.formState.isSubmitting}>Validate and submit</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Common content</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3"><Avatar><AvatarFallback>HO</AvatarFallback></Avatar><div><p className="font-medium">HospitalOS Admin</p><p className="text-sm text-muted-foreground">Platform administrator</p></div></div>
              <div className="flex flex-wrap gap-2"><Badge>Default</Badge><StatusBadge status="success">Active</StatusBadge><StatusBadge status="warning">Pending</StatusBadge><StatusBadge status="error">Failed</StatusBadge><StatusBadge status="info">Information</StatusBadge></div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Data table and states</h2>
        <DataTable columns={columns} data={demoRows} />
        <Tabs defaultValue="loading">
          <TabsList><TabsTrigger value="loading">Loading</TabsTrigger><TabsTrigger value="empty">Empty</TabsTrigger><TabsTrigger value="error">Error</TabsTrigger></TabsList>
          <TabsContent value="loading"><Skeleton className="h-20 w-full" /><LoadingState /></TabsContent>
          <TabsContent value="empty"><EmptyState title="No appointments yet" description="New appointments will appear here." /></TabsContent>
          <TabsContent value="error"><ErrorState onRetry={() => toast("Retry requested")} /></TabsContent>
        </Tabs>
      </section>
    </PageContainer>
  );
}
