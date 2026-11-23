import { apiRequest } from "@/lib/api/client";
import type { SetupReadiness } from "@/types/setup";

export async function getSetupReadiness(branchId?: string): Promise<SetupReadiness> {
  const response = await apiRequest<{ readiness: SetupReadiness }>({
    method: "GET",
    url: "/tenant/setup-readiness",
    params: branchId ? { branchId } : undefined,
  });
  return response.data.readiness;
}
