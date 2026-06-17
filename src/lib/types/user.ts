export const USER_ROLES = ["administrator", "user"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["invited", "active", "disabled"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

export type UserFormInput = {
  email: string;
  fullName: string;
  role: UserRole;
};

export function formatUserRole(role: UserRole) {
  return role === "administrator" ? "Administrator" : "User";
}

export function formatUserStatus(status: UserStatus) {
  switch (status) {
    case "invited":
      return "Invited";
    case "active":
      return "Active";
    case "disabled":
      return "Disabled";
  }
}
