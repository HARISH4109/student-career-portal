import type { RoleName } from '@career-portal/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { activateUser, assignUserRole, deactivateUser, getUsers, revokeUserRole } from '../api/admin-api';
import type { UserListItem } from '../types';

const ALL_ROLES: RoleName[] = ['STUDENT', 'PLACEMENT_FACULTY', 'ADMIN'];

export function UserManagementTab(): React.JSX.Element {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Role assignment modal
  const [roleModalUser, setRoleModalUser] = useState<UserListItem | null>(null);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<RoleName>('STUDENT');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter, activeFilter],
    queryFn: () =>
      getUsers({
        page,
        pageSize: 10,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      }),
  });

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('User activated successfully');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'health'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to activate user');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('User deactivated successfully');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'health'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to deactivate user');
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: RoleName }) => assignUserRole(userId, role),
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Role assigned successfully');
      setRoleModalUser(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to assign role');
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: RoleName }) => revokeUserRole(userId, role),
    onSuccess: async () => {
      clearMessages();
      setSuccessMessage('Role revoked successfully');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: Error) => {
      clearMessages();
      setErrorMessage(err.message || 'Failed to revoke role');
    },
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by full name or email address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="PLACEMENT_FACULTY">Faculty</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">
                  User Details
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">
                  Roles
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">
                  Created
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm">Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{user.email}</span>
                        {user.phone && <span className="text-xs text-muted-foreground/70 font-mono">{user.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              r === 'ADMIN'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : r === 'PLACEMENT_FACULTY'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {r}
                            <button
                              title={`Revoke ${r}`}
                              onClick={() => revokeRoleMutation.mutate({ userId: user.id, role: r })}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            setRoleModalUser(user);
                            setSelectedRoleToAssign('STUDENT');
                          }}
                          title="Assign new role"
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-card px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Role
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          user.isActive
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" /> Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5" /> Deactivated
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.isActive ? (
                        <button
                          onClick={() => deactivateMutation.mutate(user.id)}
                          disabled={deactivateMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => activateMutation.mutate(user.id)}
                          disabled={activateMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-3.5 text-xs text-muted-foreground">
            <span>
              Showing Page {meta.page} of {meta.totalPages} ({meta.totalItems} total users)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-foreground hover:bg-muted/40 disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-foreground hover:bg-muted/40 disabled:opacity-50 cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">Assign Institutional Role</h3>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted/40 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Target User</p>
                <p className="text-sm font-semibold text-foreground">{roleModalUser.fullName}</p>
                <p className="text-xs text-muted-foreground font-mono">{roleModalUser.email}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Select Role</label>
                <select
                  value={selectedRoleToAssign}
                  onChange={(e) => setSelectedRoleToAssign(e.target.value as RoleName)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r} disabled={roleModalUser.roles.includes(r)}>
                      {r} {roleModalUser.roles.includes(r) ? '(Already Assigned)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                onClick={() => setRoleModalUser(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  assignRoleMutation.mutate({
                    userId: roleModalUser.id,
                    role: selectedRoleToAssign,
                  })
                }
                disabled={assignRoleMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {assignRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Assign Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
