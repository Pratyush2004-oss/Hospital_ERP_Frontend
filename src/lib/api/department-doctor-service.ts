import { apiRequest } from "@/lib/api/client";
import type {
  Department,
  DepartmentInput,
  Doctor,
  DoctorBranchAssignment,
  DoctorInput,
  DoctorUpdateInput,
} from "@/types/management";

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export async function listDepartments(query: { page: number; limit: number; search?: string; isActive?: boolean; branchId?: string }) {
  const response = await apiRequest<{ departments: Department[] }>({
    method: "GET",
    url: "/departments",
    params: { ...query, isActive: query.isActive === undefined ? undefined : String(query.isActive) },
  });
  return { departments: response.data.departments, pagination: readPagination(response.meta) };
}

export async function getDepartment(id: string): Promise<Department> {
  const response = await apiRequest<{ department: Department }>({ method: "GET", url: `/departments/${id}` });
  return response.data.department;
}

export async function createDepartment(input: DepartmentInput): Promise<Department> {
  const response = await apiRequest<{ department: Department }>({ method: "POST", url: "/departments", data: input });
  return response.data.department;
}

export async function updateDepartment(id: string, input: DepartmentInput): Promise<Department> {
  const response = await apiRequest<{ department: Department }>({ method: "PATCH", url: `/departments/${id}`, data: input });
  return response.data.department;
}

export async function updateDepartmentBranches(id: string, branchIds: string[]): Promise<Department> {
  const response = await apiRequest<{ department: Department }>({ method: "PUT", url: `/departments/${id}/branches`, data: { branchIds } });
  return response.data.department;
}

export async function updateDepartmentStatus(id: string, isActive: boolean): Promise<Department> {
  const response = await apiRequest<{ department: Department }>({ method: "PATCH", url: `/departments/${id}/status`, data: { isActive } });
  return response.data.department;
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiRequest<undefined>({ method: "DELETE", url: `/departments/${id}` });
}

export async function listDoctors(query: { page: number; limit: number; search?: string; isActive?: boolean; departmentId?: string; branchId?: string; specialization?: string }) {
  const response = await apiRequest<{ doctors: Doctor[] }>({
    method: "GET",
    url: "/doctors",
    params: { ...query, isActive: query.isActive === undefined ? undefined : String(query.isActive) },
  });
  return { doctors: response.data.doctors, pagination: readPagination(response.meta) };
}

export async function getDoctor(id: string): Promise<Doctor> {
  const response = await apiRequest<{ doctor: Doctor }>({ method: "GET", url: `/doctors/${id}` });
  return response.data.doctor;
}

export async function createDoctor(input: DoctorInput): Promise<Doctor> {
  const response = await apiRequest<{ doctor: Doctor }>({ method: "POST", url: "/doctors", data: input });
  return response.data.doctor;
}

export async function updateDoctor(id: string, input: DoctorUpdateInput): Promise<Doctor> {
  const response = await apiRequest<{ doctor: Doctor }>({ method: "PATCH", url: `/doctors/${id}`, data: input });
  return response.data.doctor;
}

export async function updateDoctorDepartments(id: string, departmentIds: string[]): Promise<Doctor> {
  const response = await apiRequest<{ doctor: Doctor }>({ method: "PUT", url: `/doctors/${id}/departments`, data: { departmentIds } });
  return response.data.doctor;
}

export async function updateDoctorBranches(id: string, branches: DoctorBranchAssignment[]): Promise<Doctor> {
  const response = await apiRequest<{ doctor: Doctor }>({ method: "PUT", url: `/doctors/${id}/branches`, data: { branches } });
  return response.data.doctor;
}

export async function updateDoctorStatus(id: string, isActive: boolean): Promise<Doctor> {
  const response = await apiRequest<{ doctor: Doctor }>({ method: "PATCH", url: `/doctors/${id}/status`, data: { isActive } });
  return response.data.doctor;
}

export async function deleteDoctor(id: string): Promise<void> {
  await apiRequest<undefined>({ method: "DELETE", url: `/doctors/${id}` });
}

function readPagination(meta: Record<string, unknown> | undefined): Pagination {
  const value = meta?.pagination;
  if (!value || typeof value !== "object") throw new Error("Management response did not include pagination metadata.");
  const pagination = value as Record<string, unknown>;
  const fields = ["page", "pageSize", "total", "totalPages"];
  if (!fields.every((field) => typeof pagination[field] === "number")) throw new Error("Management response contained invalid pagination metadata.");
  return {
    page: pagination.page as number,
    pageSize: pagination.pageSize as number,
    total: pagination.total as number,
    totalPages: pagination.totalPages as number,
  };
}
