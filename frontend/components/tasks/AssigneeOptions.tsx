import type { PersonOption } from "@/hooks/useTasks";

/**
 * The people options for an assignee <select>. With a department chosen, an
 * admin sees its members first, then everyone else on the team.
 */
export function AssigneeOptions({
  department,
  members,
  others,
}: {
  department: string | null;
  members: PersonOption[];
  others: PersonOption[];
}) {
  const opts = (list: PersonOption[]) =>
    list.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>);
  if (!department || members.length === 0 || others.length === 0) return <>{opts([...members, ...others])}</>;
  return (
    <>
      <optgroup label={department}>{opts(members)}</optgroup>
      <optgroup label="Everyone else">{opts(others)}</optgroup>
    </>
  );
}
