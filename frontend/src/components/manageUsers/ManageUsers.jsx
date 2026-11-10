import React, { useMemo, useState } from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { LockIcon } from '@phosphor-icons/react/dist/csr/Lock';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
import { useAuth } from '../../contexts/AuthContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import { AdminTop, Button, Card, ConfirmDialog, EmptyState, Notice, Page, PageHeader, Pagination, SearchField, SelectField, Skeleton, SkeletonRows, formatNumber, pluralize } from '../ui';
import UserDrawer from './UserDrawer';
import UserTable, { RoleBadge } from './UserTable';
import { ROLES, consequenceOf, roleInfo } from './manageUsersModel';
import useManageUsers from './useManageUsers';
import './manageUsers.css';

const percent = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%');

/**
 * Manage users (route /admin/manage-users, admins only): every account with its role, department,
 * graduating year and section, filters, pages of ten, and a 480px drawer to open a person and
 * change their role. A role change always goes through a confirmation that names the person and
 * the consequence. design/screens.md section 16 (Admin management screens).
 *
 * Same API, headers, filters and role check as the page it replaces (see useManageUsers).
 */
export default function ManageUsers() {
  const { user } = useAuth();
  const phone = useMediaQuery('(max-width: 899.95px)');
  const data = useManageUsers();
  const { users, filtered, rows, counts, filters, loading, error } = data;

  const [selectedId, setSelectedId] = useState(null);
  const [pending, setPending] = useState(null);

  const ownId = user?._id || user?.id || null;
  const selected = useMemo(() => users.find((person) => person._id === selectedId) || null, [users, selectedId]);
  const firstLoad = (loading || !user) && users.length === 0;

  // Only administrators manage users
  if (user && user.userType !== 'admin') {
    return (
      <Page>
        <PageHeader title="Manage users" />
        <Card>
          <EmptyState
            icon={<LockIcon size={28} weight="regular" />}
            title="Access denied"
            text="Only administrators can manage users. Ask an administrator if you need access."
          />
        </Card>
      </Page>
    );
  }

  const closePending = () => setPending(null);

  const confirm = async () => {
    const ok = await data.changeRole(pending.person, pending.newRole);
    if (!ok) return;
    setPending(null);
    setSelectedId(null);
  };

  const demotion = pending ? ROLES.findIndex((role) => role.value === pending.newRole) < ROLES.findIndex((role) => role.value === pending.person.userType) : false;

  const tiles = [
    { key: 'total', label: 'Total users', value: counts.total, context: `Across ${pluralize(counts.departments, 'department')}`, spotlight: true },
    { key: 'user', label: 'Students', value: counts.user, context: `${percent(counts.user, counts.total)} of all users` },
    { key: 'teacher', label: 'Teachers', value: counts.teacher, context: `${percent(counts.teacher, counts.total)} of all users` },
    { key: 'admin', label: 'Admins', value: counts.admin, context: `${percent(counts.admin, counts.total)} of all users` },
  ];

  return (
    <Page className="mu-page">
      <AdminTop
        title="Manage users"
        count={firstLoad ? undefined : data.filtering ? `${formatNumber(filtered.length)} of ${pluralize(users.length, 'user')}` : pluralize(users.length, 'user')}
        description="See everyone on the platform and change their role."
        actions={
          <Button onClick={data.reload} loading={loading && users.length > 0} startIcon={<ArrowsClockwiseIcon size={18} weight="regular" aria-hidden="true" />}>
            Refresh
          </Button>
        }
        label="Filter users"
        search={
          <SearchField
            value={filters.query}
            onChange={(value) => data.setFilter('query', value)}
            label="Search users"
            placeholder="Search by name, email, roll number or department"
          />
        }
        filters={
          <>
            <SelectField
              variant="pill"
              aria-label="Role"
              value={filters.role}
              onChange={(event) => data.setFilter('role', event.target.value)}
              options={[{ value: 'all', label: 'All roles' }, ...ROLES.map((role) => ({ value: role.value, label: role.label }))]}
            />
            <SelectField
              variant="pill"
              aria-label="Department"
              value={filters.department}
              onChange={(event) => data.setFilter('department', event.target.value)}
              options={[{ value: 'all', label: 'All departments' }, ...data.departments.map((name) => ({ value: name, label: name }))]}
            />
            {data.filtering ? (
              <Button variant="ghost" size="sm" onClick={data.clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </>
        }
      />
      <section className="mu-stats" aria-label="Summary">
        {tiles.map((tile) => (
          <div key={tile.key} className="mu-stat" data-spotlight={tile.spotlight ? 'true' : 'false'}>
            <p className="mu-stat__label">{tile.label}</p>
            {firstLoad ? <Skeleton width={72} height={36} radius="var(--ds-radius-sm)" /> : <p className="mu-stat__value">{formatNumber(tile.value)}</p>}
            <p className="mu-stat__context">{tile.context}</p>
          </div>
        ))}
      </section>

      <Card flush className="mu-card">
        {firstLoad || (loading && users.length === 0) ? (
          <SkeletonRows count={8} height={44} />
        ) : error && users.length === 0 ? (
          <div className="mu-state">
            <Notice
              tone="danger"
              title="We could not load the users"
              action={
                <Button variant="ghost" onClick={data.reload}>
                  Retry
                </Button>
              }
            >
              Check your connection and try again. Nothing was changed.
            </Notice>
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={<UsersIcon size={28} weight="regular" />} title="No users yet" text="People appear here once they have signed up." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<MagnifyingGlassIcon size={28} weight="regular" />}
            title="No users match these filters"
            text="Try a different search, or show everyone again."
            action={<Button onClick={data.clearFilters}>Clear filters</Button>}
          />
        ) : (
          <>
            <UserTable rows={rows} phone={phone} ownId={ownId} onOpen={(person) => setSelectedId(person._id)} />
            <Pagination page={data.page} pageSize={data.pageSize} total={filtered.length} onPage={data.setPage} onPageSize={data.setPageSize} />
          </>
        )}
      </Card>

      <UserDrawer
        open={Boolean(selected) && !pending}
        onClose={() => setSelectedId(null)}
        person={selected}
        isOwn={Boolean(selected) && selected._id === ownId}
        onChangeRole={(person, newRole) => setPending({ person, newRole })}
      />

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={closePending}
        title={pending ? `Change ${pending.person.name}'s role to ${roleInfo(pending.newRole).label}?` : 'Change role?'}
        description={pending ? consequenceOf(pending.person, pending.newRole) : ''}
        confirmLabel={pending ? `Change to ${roleInfo(pending.newRole).label}` : 'Change role'}
        danger={demotion}
        busy={data.changing}
        onConfirm={confirm}
      >
        {pending ? (
          <div className="mu-change" role="group" aria-label="Role change">
            <RoleBadge role={pending.person.userType} />
            <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
            <RoleBadge role={pending.newRole} />
          </div>
        ) : null}
      </ConfirmDialog>
    </Page>
  );
}
