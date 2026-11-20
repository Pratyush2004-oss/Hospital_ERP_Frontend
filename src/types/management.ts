export type TenantStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";

export type TenantMembership = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: TenantStatus;
  status: string;
  joinedAt: string | null;
  createdAt: string;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  status: TenantStatus;
  timezone: string;
  createdAt: string;
};

export type RegisterTenantInput = {
  name: string;
  slug?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  timezone?: string;
};

export type Branch = {
  id: string;
  name: string;
  branchCode: string;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BranchListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "name" | "branchCode" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

export type BranchInput = {
  name: string;
  branchCode: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  timezone?: string;
  isActive?: boolean;
};

export type UpdateBranchInput = Partial<Omit<BranchInput, "isActive">>;

export type BranchListResponse = {
  branches: Branch[];
};

export type BranchPagination = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type TenantStaffMember = {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
    status: string;
    joinedAt: string | null;
    roles: { id: string; slug: string; name: string }[];
  };

export type DepartmentBranchSummary = Pick<Branch, "id" | "name" | "branchCode" | "isActive">;

export type Department = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    branchId: string;
    createdAt: string;
    updatedAt: string;
    branches: DepartmentBranchSummary[];
  };

export type DepartmentInput = {
    name: string;
    slug?: string;
    description?: string | null;
    branchIds?: string[];
    isActive?: boolean;
  };

export type DoctorDepartmentSummary = {
    id: string;
    name: string;
    slug: string;
    branchId: string;
    isActive: boolean;
  };

export type DoctorBranchSummary = {
    id: string;
    branchId: string;
    branchName: string;
    branchCode: string;
    branchIsActive: boolean;
    consultationFee: string;
    currency: string;
    isActive: boolean;
  };

export type Doctor = {
    id: string;
    userId: string;
    doctorCode: string;
    registrationNumber: string;
    registrationCouncil: string | null;
    qualification: string | null;
    specialization: string | null;
    experienceYears: number | null;
    biography: string | null;
    profileImageUrl: string | null;
    consultationLanguage: string[] | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    user: { id: string; fullName: string; email: string; phone: string | null; isActive: boolean };
    departments: DoctorDepartmentSummary[];
    branches: DoctorBranchSummary[];
  };

export type DoctorBranchAssignment = {
    branchId: string;
    consultationFee?: string | number;
    currency?: string;
    isActive?: boolean;
  };

export type DoctorInput = {
    userId: string;
    doctorCode: string;
    registrationNumber: string;
    registrationCouncil?: string | null;
    qualification?: string | null;
    specialization?: string | null;
    experienceYears?: number | null;
    biography?: string | null;
    profileImageUrl?: string | null;
    consultationLanguage?: string[] | null;
    isActive?: boolean;
    departmentIds?: string[];
    branches?: DoctorBranchAssignment[];
  };

export type DoctorUpdateInput = Omit<DoctorInput, "userId" | "departmentIds" | "branches" | "isActive">;
