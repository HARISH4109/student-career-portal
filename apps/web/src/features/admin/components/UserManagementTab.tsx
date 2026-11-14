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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by full name or email address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
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
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  User Details
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Roles
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Created
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-sm">Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{user.fullName}</span>
                        <span className="text-xs text-slate-500">{user.email}</span>
                        {user.phone && <span className="text-xs text-slate-400">{user.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              r === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : r === 'PLACEMENT_FACULTY'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {r}
                            <button
                              title={`Revoke ${r}`}
                              onClick={() => revokeRoleMutation.mutate({ userId: user.id, role: r })}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
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
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600"
                        >
                          <Plus className="h-3 w-3" /> Role
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
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
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.isActive ? (
                        <button
                          onClick={() => deactivateMutation.mutate(user.id)}
                          disabled={deactivateMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => activateMutation.mutate(user.id)}
                          disabled={activateMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
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
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 text-xs text-slate-500">
            <span>
              Showing Page {meta.page} of {meta.totalPages} ({meta.totalItems} total users)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Assign Institutional Role</h3>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Target User</p>
                <p className="text-sm font-semibold text-slate-800">{roleModalUser.fullName}</p>
                <p className="text-xs text-slate-500">{roleModalUser.email}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Role</label>
                <select
                  value={selectedRoleToAssign}
                  onChange={(e) => setSelectedRoleToAssign(e.target.value as RoleName)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r} disabled={roleModalUser.roles.includes(r)}>
                      {r} {roleModalUser.roles.includes(r) ? '(Already Assigned)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setRoleModalUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
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
