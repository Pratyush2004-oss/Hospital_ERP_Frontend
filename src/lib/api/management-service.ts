import { apiRequest } from "@/lib/api/client";
import type {
  Branch,
  BranchInput,
  BranchListQuery,
  BranchListResponse,
  RegisterTenantInput,
  TenantMembership,
  TenantSummary,
  UpdateBranchInput,
} from "@/types/management";

export async function listTenantMemberships(): Promise<TenantMembership[]> {
  const response = await apiRequest<{ memberships: TenantMembership[] }>({
    method: "GET",
    url: "/tenants/memberships",
  });
  return response.data.memberships;
}

export async function selectTenant(slug: string): Promise<void> {
  await apiRequest({
    method: "POST",
    url: "/tenants/select",
    data: { slug },
  });
}

export async function registerTenant(input: RegisterTenantInput): Promise<TenantMembership | null> {
  const response = await apiRequest<{ tenant: TenantSummary; membershipId: string | null }>({
    method: "POST",
    url: "/tenants/register",
    data: input,
  });
  return response.data.tenant
    ? {
        id: response.data.membershipId ?? response.data.tenant.id,
        tenantId: response.data.tenant.id,
        tenantName: response.data.tenant.name,
        tenantSlug: response.data.tenant.slug,
        tenantStatus: response.data.tenant.status,
        status: "ACTIVE",
        joinedAt: null,
        createdAt: response.data.tenant.createdAt,
      }
    : null;
}

export async function listBranches(query: BranchListQuery): Promise<{
  branches: Branch[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  const params = {
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    isActive: query.isActive === undefined ? undefined : String(query.isActive),
    sortBy: query.sortBy ?? "name",
    sortOrder: query.sortOrder ?? "asc",
  };
  const response = await apiRequest<BranchListResponse>({ method: "GET", url: "/branches", params });
  const pagination = response.meta?.pagination;
  if (!pagination || typeof pagination !== "object") {
    throw new Error("Branch list response did not include pagination metadata.");
  }
  const value = pagination as { page?: unknown; pageSize?: unknown; total?: unknown; totalPages?: unknown };
  if (![value.page, value.pageSize, value.total, value.totalPages].every((item) => typeof item === "number")) {
    throw new Error("Branch list response contained invalid pagination metadata.");
  }
  const page = value.page as number;
  const pageSize = value.pageSize as number;
  const total = value.total as number;
  const totalPages = value.totalPages as number;
  return {
    branches: response.data.branches,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function getBranch(id: string): Promise<Branch> {
  const response = await apiRequest<{ branch: Branch }>({
    method: "GET",
    url: `/branches/${id}`,
  });
  return response.data.branch;
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const response = await apiRequest<{ branch: Branch }>({
    method: "POST",
    url: "/branches",
    data: input,
  });
  return response.data.branch;
}

export async function updateBranch(id: string, input: UpdateBranchInput): Promise<Branch> {
  const response = await apiRequest<{ branch: Branch }>({
    method: "PATCH",
    url: `/branches/${id}`,
    data: input,
  });
  return response.data.branch;
}

export async function updateBranchStatus(id: string, isActive: boolean): Promise<Branch> {
  const response = await apiRequest<{ branch: Branch }>({
    method: "PATCH",
    url: `/branches/${id}/status`,
    data: { isActive },
  });
  return response.data.branch;
}

export async function deleteBranch(id: string): Promise<void> {
  await apiRequest<undefined>({
    method: "DELETE",
    url: `/branches/${id}`,
  });
}
