export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type ActiveTenant = {
  id: string;
  slug: string;
  roles: string[];
  permissions: string[];
};

export type CurrentUserResponse = {
  user: AuthUser;
  sessionId: string;
  plane: "user" | "tenant" | "platform";
  activeTenant: ActiveTenant | null;
};

export type AuthSession = {
  user: AuthUser;
  sessionId?: string;
  plane?: CurrentUserResponse["plane"];
  activeTenant?: ActiveTenant | null;
};
