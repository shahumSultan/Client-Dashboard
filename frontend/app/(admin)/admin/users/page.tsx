"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UserPlus } from "lucide-react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/shared/ProjectSections";
import { useCurrentUser } from "@/hooks/useAuth";
import { errorDetail } from "@/hooks/useEngagements";
import { Badge } from "@/components/ui/badge";
import { isTeamRole, type User, type Organization } from "@/lib/types";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data),
  });
  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then((r) => r.data),
  });

  const orgName = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/admin/users/${userId}/role`, { role }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
    onError: (err) => toast.error(errorDetail(err, "Couldn't update that role")),
  });

  return (
    <div>
      <PageHeading
        title="Users"
        description={
          isLoading
            ? "Loading…"
            : `${users.length} ${users.length === 1 ? "person has" : "people have"} access.`
        }
      />

      <Card className="mb-5 flex items-start gap-3 px-5 py-4">
        <UserPlus size={16} className="mt-0.5 shrink-0 text-brand-soft" aria-hidden="true" />
        <div className="text-sm leading-relaxed text-subtle">
          <p className="font-medium text-fg">Adding someone to your team</p>
          <p className="mt-1">
            Invite them from{" "}
            <Link href="/admin/company?tab=team" className="link-signal">Company → Team</Link>: they get an
            email, sign up with that address, and land on the team with the role you chose. Someone who
            already signed up appears below - set their role here.{" "}
            <span className="text-fg">Employee</span> sees tasks, departments, the team and policy and
            brand documents, never clients or bank accounts;{" "}
            <span className="text-fg">Admin</span> has full control.
          </p>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-card" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No users yet"
            description="People who sign up will appear here, where you can set their role."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-5 py-4 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    name={u.full_name}
                    email={u.email}
                    src={u.avatar_url}
                    highlight={isTeamRole(u.role)}
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
                      {u.full_name ?? "-"}
                      {u.id === me?.id && <Badge variant="brand">You</Badge>}
                    </p>
                    <p className="truncate text-xs text-faint">
                      {u.email || u.clerk_id}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-xs text-subtle sm:block">
                    {u.organization_id
                      ? (orgName[u.organization_id] ?? "Unknown workspace")
                      : "No workspace"}
                  </span>
                  <Select
                    aria-label={`Role for ${u.full_name ?? u.email}`}
                    value={u.role}
                    // Your own role is fixed: demoting yourself would leave
                    // nobody able to promote you back.
                    disabled={u.id === me?.id}
                    title={u.id === me?.id ? "You can't change your own role" : undefined}
                    onChange={(e) =>
                      updateRole.mutate({ userId: u.id, role: e.target.value })
                    }
                    className="h-9 w-auto min-w-[11rem] text-xs"
                  >
                    {/* Team roles are for Enigma-Cube people, not anyone in a client's workspace. */}
                    <option value="admin" disabled={!!u.organization_id}>Admin - full control</option>
                    <option value="employee" disabled={!!u.organization_id}>Employee</option>
                    <option value="client_owner">Client owner</option>
                    <option value="client_member">Client member</option>
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
