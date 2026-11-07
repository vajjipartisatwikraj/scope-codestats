import React, { useEffect, useRef, useState } from 'react';
import { LockIcon } from '@phosphor-icons/react/dist/csr/Lock';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
import { useAuth } from '../../contexts/AuthContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import { Button, Card, Dialog, EmptyState, Notice, Page, PageHeader, Pagination, PillTabs, SearchField, SkeletonRows, TextField, formatNumber, pluralize } from '../ui';
import AccountList from './AccountList';
import useSuspendAccounts from './useSuspendAccounts';
import './suspendAccounts.css';

/**
 * Suspend accounts (route /admin/suspend-accounts, admins only). Removes the coding accounts of a
 * student: every linked coding profile and all the history stored with them (scores, ranks, daily
 * progress and the activity heatmap). The student's account and coursework stay, and they can still
 * sign in; their rank and consistency index go back to zero.
 *
 * It cannot be undone, so removing is always a two step action: the button opens a confirmation
 * that lists exactly what will be deleted, and the admin has to type the student's roll number.
 * design/screens.md section 16 (Admin management screens).
 */

const SCOPES = [
  { key: 'linked', label: 'With coding profiles' },
  { key: 'all', label: 'All accounts' },
];

/** The lines of the confirmation: what is deleted and how much of it */
const deletionLines = (counts) => [
  { key: 'profiles', text: pluralize(counts.profiles, 'linked coding profile') },
  { key: 'snapshots', text: `${formatNumber(counts.snapshots)} daily progress ${counts.snapshots === 1 ? 'record' : 'records'} (problems, ratings, contests)` },
  { key: 'scoreHistory', text: `${formatNumber(counts.scoreHistory)} score and rank ${counts.scoreHistory === 1 ? 'record' : 'records'}` },
  { key: 'heatmapDays', text: `${formatNumber(counts.heatmapDays)} ${counts.heatmapDays === 1 ? 'day' : 'days'} of the activity heatmap` },
];

export default function SuspendAccounts() {
  const { user } = useAuth();
  const compact = useMediaQuery('(max-width: 899.95px)');
  const data = useSuspendAccounts();
  const { accounts, total, loading, error, scope, search } = data;

  const [reviewingId, setReviewingId] = useState(null);
  const [target, setTarget] = useState(null); // { account, preview }
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const bodyRef = useRef(null);

  // A shorter list (a removal, another tab) can leave the page number past the end
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(total / data.pageSize));
    if (!loading && data.page > pages) data.setPage(pages);
  }, [total, data.pageSize, data.page, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only administrators open this page
  if (user && user.userType !== 'admin') {
    return (
      <Page>
        <PageHeader title="Suspend accounts" />
        <Card>
          <EmptyState icon={<LockIcon size={28} weight="regular" />} title="Access denied" text="Only administrators can remove coding accounts. Ask an administrator if you need access." />
        </Card>
      </Page>
    );
  }

  const openRemoval = async (account) => {
    setReviewingId(account._id);
    const result = await data.review(account._id);
    setReviewingId(null);
    if (!result.ok) return;
    setTyped('');
    setTarget({ account, preview: result.preview });
  };

  const close = () => {
    if (busy) return;
    setTarget(null);
    setTyped('');
  };

  const person = target ? target.account : null;
  const counts = target ? target.preview.counts : null;
  const nothingStored = counts ? Object.values(counts).every((count) => count === 0) : false;
  const confirmed = person ? typed.trim().toLowerCase() === String(person.rollNumber).toLowerCase() : false;

  const confirm = async () => {
    if (!confirmed || nothingStored || busy) return;
    setBusy(true);
    const result = await data.suspend(person);
    setBusy(false);
    // Either it worked or the account is gone: the list was reloaded, so the dialog is done
    setTarget(null);
    setTyped('');
    if (result.ok) setAnnouncement(result.message);
    window.requestAnimationFrame(() => bodyRef.current && bodyRef.current.focus());
  };

  const firstLoad = loading && accounts.length === 0 && !error;
  const searching = Boolean(search);

  return (
    <Page className="sa">
      <PageHeader
        title="Suspend accounts"
        count={loading || error ? undefined : `${pluralize(total, 'account')} ${searching ? 'found' : scope === 'linked' ? 'with coding profiles' : ''}`.trim()}
        description="Remove a student's coding accounts: every linked platform and all the history stored with them, including scores, ranks, progress charts and the activity heatmap. Their account and coursework stay and they can still sign in. This cannot be undone."
      />

      <Card flush>
        <h2 className="ui-sr">Accounts</h2>
        <div className="sa-bar">
          <SearchField value={data.query} onChange={data.setQuery} label="Search accounts" placeholder="Search by name, email, roll number or department" className="sa-search" />
          <PillTabs role="radiogroup" label="Which accounts" items={SCOPES} value={scope} onChange={data.setScope} />
        </div>

        <div ref={bodyRef} tabIndex={-1} className="sa-body" aria-busy={loading}>
          {firstLoad ? (
            <SkeletonRows count={6} height={compact ? 120 : 56} />
          ) : error ? (
            <div className="sa-pad">
              <Notice
                tone="danger"
                title="We could not load the accounts"
                action={
                  <Button variant="ghost" size="sm" onClick={data.load}>
                    Retry
                  </Button>
                }
              >
                {error} Nothing was changed.
              </Notice>
            </div>
          ) : accounts.length === 0 ? (
            searching ? (
              <EmptyState
                icon={<MagnifyingGlassIcon size={28} weight="regular" />}
                title="No accounts match this search"
                text={scope === 'linked' ? 'Only accounts with a linked coding profile are shown. Try "All accounts", or a different search.' : 'Try a different name, email or roll number.'}
                action={<Button onClick={() => data.setQuery('')}>Clear the search</Button>}
              />
            ) : (
              <EmptyState
                icon={<UsersIcon size={28} weight="regular" />}
                title="No accounts have coding profiles"
                text="Accounts show up here once a student links a coding platform."
                action={<Button onClick={() => data.setScope('all')}>Show all accounts</Button>}
              />
            )
          ) : (
            <AccountList accounts={accounts} compact={compact} reviewingId={reviewingId} onRemove={openRemoval} />
          )}
        </div>

        {!firstLoad && !error && total > 10 ? (
          <Pagination page={data.page} pageSize={data.pageSize} total={total} onPage={data.setPage} onPageSize={data.setPageSize} />
        ) : null}
      </Card>

      <p className="ui-sr" role="status" aria-live="polite">
        {announcement}
      </p>

      <Dialog
        open={Boolean(target)}
        onClose={close}
        busy={busy}
        as="form"
        onSubmit={confirm}
        title={person ? `Remove the coding accounts of ${person.name}?` : 'Remove coding accounts?'}
        description={
          person
            ? nothingStored
              ? 'Nothing is stored for this account, so there is nothing to remove.'
              : `This permanently deletes the data below. ${person.name} keeps their account and coursework and can still sign in, but their rank and consistency index go back to zero. This cannot be undone.`
            : ''
        }
        actions={
          <>
            <Button onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={busy} disabled={!confirmed || nothingStored}>
              Remove coding accounts
            </Button>
          </>
        }
      >
        {person ? (
          <div className="sa-confirm">
            {nothingStored ? null : (
              <>
                <ul className="sa-counts" aria-label="What will be deleted">
                  {deletionLines(counts)
                    .filter((line) => counts[line.key] > 0)
                    .map((line) => (
                      <li key={line.key}>{line.text}</li>
                    ))}
                </ul>
                <TextField
                  label={`Type ${person.rollNumber} to confirm`}
                  hint="This is the student's roll number."
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  disabled={busy}
                  autoComplete="off"
                  spellCheck={false}
                />
              </>
            )}
          </div>
        ) : null}
      </Dialog>
    </Page>
  );
}
