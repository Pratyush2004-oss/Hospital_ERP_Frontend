import { Construction } from "lucide-react";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const instant = false;

const knownRoutes = new Set([
  "hospitals",
  "branches",
  "departments",
  "doctors",
  "patients",
  "appointments",
  "scheduling",
  "doctor-availability",
  "invoices",
  "payments",
  "refunds",
  "financial-reports",
  "notifications",
  "users-roles",
  "settings",
]);

export default async function PlaceholderPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const route = slug.join("/");
  if (slug.length !== 1 || !knownRoutes.has(route)) {
    notFound();
  }

  const title = route.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

  return (
    <PageContainer>
      <PageHeader eyebrow="Development placeholder" title={title} description="This route is reserved for a future HospitalOS module." />
      <Alert>
        <Construction className="size-4 text-primary" />
        <AlertTitle>Module not implemented</AlertTitle>
        <AlertDescription>This navigation entry is intentionally non-functional until its backend contract and product workflow are defined.</AlertDescription>
      </Alert>
    </PageContainer>
  );
}
