export type SetupStepKey =
  | "hospital-profile"
  | "branch"
  | "department"
  | "staff"
  | "doctor"
  | "schedule";

export type SetupStepStatus = "complete" | "incomplete" | "pending" | "blocked";

export type SetupPrerequisite = {
  key: SetupStepKey;
  title: string;
  met: boolean;
};

export type SetupStep = {
  key: SetupStepKey;
  title: string;
  description: string;
  required: boolean;
  complete: boolean;
  status: SetupStepStatus;
  detail: string;
  actionPath: string;
  actionLabel: string;
  canAct: boolean;
  prerequisites: SetupPrerequisite[];
};

export type SetupProgress = {
  requiredCompleted: number;
  requiredTotal: number;
  optionalCompleted: number;
  optionalTotal: number;
  completed: number;
  total: number;
  percent: number;
};

export type SetupReadiness = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  generatedAt: string;
  scope: { branchId: string; branchName: string } | null;
  steps: SetupStep[];
  progress: SetupProgress;
  nextStepKey: SetupStepKey | null;
};
