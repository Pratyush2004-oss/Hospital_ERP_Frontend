import { redirect } from "next/navigation";

/** The former placeholder route now resolves to the implemented Staff module. */
export default function UsersRolesPage() {
  redirect("/staff");
}
