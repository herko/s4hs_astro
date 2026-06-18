export interface AuthorNameFields {
  firstName: string;
  lastName: string;
  middleName?: string;
  titleBefore?: string;
  titleAfter?: string;
}

export function fullName(a: AuthorNameFields): string {
  return [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
}

export function fullNameWithTitles(a: AuthorNameFields): string {
  const pre = [a.titleBefore, fullName(a)].filter(Boolean).join(" ");
  return [pre, a.titleAfter].filter(Boolean).join(", ");
}
