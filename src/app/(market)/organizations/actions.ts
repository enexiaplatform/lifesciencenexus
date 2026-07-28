"use server";

import { revalidatePath } from "next/cache";

import { getRepository } from "@/lib/data";
import { createOrganizationSchema } from "@/lib/domain/schemas";
import { IDENTIFIER_SCHEMES, type IdentifierScheme } from "@/lib/domain/types";

interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

function firstIssues(error: { issues: Array<{ path: Array<string | number>; message: string }> }): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Create an organization from the create-organization dialog. */
export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const types = formData.getAll("types").map(String).filter(Boolean);
  const website = String(formData.get("website") ?? "").trim();
  const identifierScheme = String(formData.get("identifierScheme") ?? "").trim();
  const identifierValue = String(formData.get("identifierValue") ?? "").trim();
  const identifiers =
    identifierValue !== ""
      ? [
          {
            scheme: (IDENTIFIER_SCHEMES as readonly string[]).includes(identifierScheme)
              ? (identifierScheme as IdentifierScheme)
              : "other",
            value: identifierValue,
          },
        ]
      : [];

  const parsed = createOrganizationSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    types,
    country: String(formData.get("country") ?? "").trim(),
    website: website === "" ? undefined : website,
    identifiers,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "The organization could not be created. Review the highlighted fields.",
      fieldErrors: firstIssues(parsed.error),
    };
  }

  const repo = await getRepository();
  const organization = await repo.createEntity("organization", {
    ...parsed.data,
    visibility: "canonical",
    isDemo: false,
  });
  revalidatePath("/organizations");
  return { ok: true, id: organization.id };
}
