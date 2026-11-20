import { describe, expect, it } from "vitest";
import {
  hospitalRegistrationSchema,
  registrationAccountSchema,
  toHospitalRegistrationPayload,
  toRegisterAccountPayload,
} from "./onboarding";

const validAccount = {
  fullName: "Ada Lovelace",
  email: "Ada@Example.test",
  phone: "",
  password: "correct-horse-battery",
  confirmPassword: "correct-horse-battery",
};

const validHospital = {
  name: "Riverside Care Hospital",
  slug: "riverside-care",
  legalName: "Riverside Care Pvt Ltd",
  email: "contact@riverside.test",
  phone: "+91 98765 43210",
  timezone: "Asia/Kolkata",
};

describe("public registration validation", () => {
  it("accepts a valid account and omits a blank phone", () => {
    const parsed = registrationAccountSchema.safeParse(validAccount);

    expect(parsed.success).toBe(true);
    expect(toRegisterAccountPayload(validAccount)).toEqual({
      fullName: "Ada Lovelace",
      email: "ada@example.test",
      password: "correct-horse-battery",
    });
  });

  it("rejects a password shorter than the backend minimum", () => {
    const parsed = registrationAccountSchema.safeParse({
      ...validAccount,
      password: "short",
      confirmPassword: "short",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("at least 12");
    }
  });

  it("rejects passwords longer than 72 UTF-8 bytes", () => {
    const password = "é".repeat(40);
    const parsed = registrationAccountSchema.safeParse({
      ...validAccount,
      password,
      confirmPassword: password,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes("72 bytes"))).toBe(
        true,
      );
    }
  });

  it("rejects mismatched password confirmation", () => {
    const parsed = registrationAccountSchema.safeParse({
      ...validAccount,
      confirmPassword: "different-password",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("accepts a minimal hospital and omits blank optional fields", () => {
    const parsed = hospitalRegistrationSchema.safeParse({
      name: "Riverside",
      slug: "",
      legalName: "",
      email: "",
      phone: "",
      timezone: "UTC",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(toHospitalRegistrationPayload(parsed.data)).toEqual({
        name: "Riverside",
        timezone: "UTC",
      });
    }
  });

  it("rejects invalid hospital slug, email and phone values", () => {
    expect(
      hospitalRegistrationSchema.safeParse({ ...validHospital, slug: "Riverside Care" })
        .success,
    ).toBe(false);
    expect(
      hospitalRegistrationSchema.safeParse({ ...validHospital, slug: "ab" }).success,
    ).toBe(false);
    expect(
      hospitalRegistrationSchema.safeParse({ ...validHospital, email: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      hospitalRegistrationSchema.safeParse({ ...validHospital, phone: "abc" }).success,
    ).toBe(false);
  });

  it("normalizes the hospital payload without inventing optional values", () => {
    expect(
      toHospitalRegistrationPayload({
        ...validHospital,
        slug: " riverside-care ",
        email: " Contact@Riverside.test ",
        phone: " +91 98765 43210 ",
      }),
    ).toEqual({
      name: "Riverside Care Hospital",
      slug: "riverside-care",
      legalName: "Riverside Care Pvt Ltd",
      email: "contact@riverside.test",
      phone: "+91 98765 43210",
      timezone: "Asia/Kolkata",
    });
  });
});
