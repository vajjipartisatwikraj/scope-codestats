import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { LinkIcon } from '@phosphor-icons/react/dist/csr/Link';
import { LinkBreakIcon } from '@phosphor-icons/react/dist/csr/LinkBreak';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import { Badge, Button, Chip, ConfirmDialog, Drawer, EmptyState, IconButton, Notice, SelectField, Skeleton, formatNumber, pluralize } from '../ui';
import './AttachedUserGroupsDialog.css';

/** The students a 409 (clone conflict) names, grouped by the other cohort */
function ConflictNotice({ conflict }) {
  return (
    <Notice tone="danger" title={conflict.message}>
      {(conflict.conflictsByCohort || []).map((entry) => {
        const users = entry.users || [];
        return (
          <div key={entry.cohortId} className="ugd-conflict">
            <p className="ugd-conflict__title">
              {entry.cohortTitle} ({formatNumber(users.length)})
            </p>
            <p className="ugd-conflict__rolls">
              {users
                .slice(0, 8)
                .map((user) => user.rollNumber || user.userName)
                .join(', ')}
              {users.length > 8 ? `, and ${formatNumber(users.length - 8)} more` : ''}
            </p>
          </div>
        );
      })}
      {conflict.hint ? <p>{conflict.hint}</p> : null}
    </Notice>
  );
}

/**
 * The user groups attached to one cohort or communication test. Their students are the eligible
 * students. Attaching adds the group's students; detaching removes the ones no other attached group
 * covers, so it shows who (and, for a cohort, what data would be deleted) and asks first.
 *
 * An editing task with a list, so a drawer (design/screens.md section 17); the detach question is a
 * confirmation dialog over it. Same props, API calls, callbacks, toasts and rules as the previous
 * Material UI dialog (components/userGroups/, now components/deprecated/).
 *
 *   open
 *   target        { _id, title } of the cohort or test (null while nothing is chosen)
 *   api           { list, attach, detach, sync }, see services/userGroupApi.js
 *   entityLabel   "cohort" or "test", for the wording
 *   onClose()
 *   onChanged()   a group was attached or detached, or the groups were synced
 */
export default function AttachedUserGroupsDialog({ open, target, api, entityLabel = 'cohort', onClose, onChanged }) {
  const targetId = target?._id;

  const [attached, setAttached] = useState([]);
  const [totalEligible, setTotalEligible] = useState(0);
  const [title, setTitle] = useState('');
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [busyAction, setBusyAction] = useState(''); // 'attach' | 'sync' | 'detach' | ''
  const [conflict, setConflict] = useState(null);
  const [detachPreview, setDetachPreview] = useState(null); // { group, preview }, or { switchAccess: true, preview } when limiting a global cohort
  const [accessType, setAccessType] = useState('userGroups'); // 'global' | 'userGroups'; only cohorts have it
  const isGlobal = accessType === 'global';
  const bodyRef = useRef(null);
  const loadSeq = useRef(0);
  const busy = busyAction !== '';

  const load = useCallback(async () => {
    if (!targetId) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError('');
    try {
      const [forTarget, all] = await Promise.all([api.list(targetId), userGroupApi.list()]);
      if (seq !== loadSeq.current) return;
      setAttached(forTarget.userGroups || []);
      setTotalEligible(forTarget.totalEligibleUsers || 0);
      setAccessType(forTarget.accessType || 'userGroups');
      setTitle(forTarget.title || '');
      setAllGroups(all.userGroups || []);
      setLoaded(true);
    } catch (error) {
      if (seq !== loadSeq.current) return;
      const message = apiErrorMessage(error, 'Could not load the user groups');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  useEffect(() => {
    if (open) {
      setConflict(null);
      setSelectedId('');
      setDetachPreview(null);
      setLoaded(false);
      setAttached([]);
      setAllGroups([]);
      setTotalEligible(0);
      setAccessType('userGroups');
      setTitle('');
      load();
    }
  }, [open, load]);

  // A pressed button turns disabled while it works, which drops focus to the page. Give it back to
  // the drawer so the keyboard stays inside.
  useEffect(() => {
    if (open && !busyAction && document.activeElement === document.body && bodyRef.current) bodyRef.current.focus();
  }, [open, busyAction]);

  const available = useMemo(() => {
    const attachedIds = new Set(attached.map((group) => group._id));
    return allGroups.filter((group) => !attachedIds.has(group._id));
  }, [allGroups, attached]);

  /** Shared error handling: clone conflicts show in the drawer, everything else is a toast. Returns true for a conflict. */
  const fail = (error, fallback) => {
    if (error?.response?.status === 409 && error.response.data?.conflictsByCohort) {
      setConflict(error.response.data);
      return true;
    }
    toast.error(apiErrorMessage(error, fallback));
    return false;
  };

  const changed = async () => {
    await load();
    if (onChanged) onChanged();
  };

  const attach = async () => {
    setBusyAction('attach');
    setConflict(null);
    try {
      const result = await api.attach(targetId, selectedId);
      toast.success(`${result.message}. ${pluralize(result.usersAdded || 0, 'student')} added`);
      setSelectedId('');
      await changed();
    } catch (error) {
      fail(error, 'Could not attach the user group');
    } finally {
      setBusyAction('');
    }
  };

  const sync = async () => {
    setBusyAction('sync');
    setConflict(null);
    try {
      const result = await api.sync(targetId);
      toast.success(result.message);
      await changed();
    } catch (error) {
      fail(error, 'Could not sync the user groups');
    } finally {
      setBusyAction('');
    }
  };

  /** Detach step 2: do it */
  const finishDetach = async (group) => {
    setBusyAction('detach');
    try {
      const result = await api.detach(targetId, group._id);
      toast.success(
        result.usersRemoved > 0
          ? `"${group.name}" detached. ${pluralize(result.usersRemoved, 'student')} removed`
          : `"${group.name}" detached`
      );
      setDetachPreview(null);
      await changed();
    } catch (error) {
      // A conflict is written in the drawer, so the question closes and lets it be seen
      if (fail(error, 'Could not detach the user group')) setDetachPreview(null);
    } finally {
      setBusyAction('');
    }
  };

  /** Detach step 1: ask the server what would be deleted */
  const startDetach = async (group) => {
    setBusyAction('detach');
    setConflict(null);
    try {
      const preview = await api.detach(targetId, group._id, { preview: true });
      if (preview.usersToRemove === 0) {
        await finishDetach(group);
      } else {
        setDetachPreview({ group, preview });
      }
    } catch (error) {
      fail(error, 'Could not check what detaching would remove');
    } finally {
      setBusyAction('');
    }
  };

  /** Change who can access the cohort, step 2: do it */
  const finishAccess = async (next) => {
    setBusyAction('access');
    try {
      const result = await api.setAccess(targetId, next);
      toast.success(result.message);
      setDetachPreview(null);
      await changed();
    } catch (error) {
      if (fail(error, 'Could not change who can access this cohort')) setDetachPreview(null);
    } finally {
      setBusyAction('');
    }
  };

  /** Change who can access the cohort, step 1: going back to user groups asks the server who would lose their data */
  const startAccessChange = async (next) => {
    if (next === accessType) return;
    setBusyAction('access');
    setConflict(null);
    try {
      const preview = next === 'userGroups' ? await api.setAccess(targetId, next, { preview: true }) : null;
      if (preview?.usersToRemove > 0) {
        setDetachPreview({ switchAccess: true, preview });
      } else {
        await finishAccess(next);
      }
    } catch (error) {
      fail(error, 'Could not check what limiting this cohort would remove');
    } finally {
      setBusyAction('');
    }
  };

  // Only cohorts delete student data when a group is detached; tests keep the attempts.
  const totals = detachPreview?.preview.totalDataToDelete;
  const preview = detachPreview?.preview;
  const previewUsers = (preview && preview.userDetails) || [];
  const firstLoad = loading && !loaded;
  const noGroupsAtAll = loaded && allGroups.length === 0;
  const nothingToAttach = loaded && available.length === 0;
  const drawerTitle = target ? target.title || title : '';

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        busy={busy}
        title="User groups"
        description={drawerTitle || undefined}
        footer={
          <Button onClick={onClose} disabled={busy}>
            Done
          </Button>
        }
      >
        <div className="ugd-body" ref={bodyRef} tabIndex={-1}>
          {conflict ? <ConflictNotice conflict={conflict} /> : null}

          {loadError && !loaded ? (
            <Notice
              tone="danger"
              title="We could not load the user groups"
              action={
                <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                  Retry
                </Button>
              }
            >
              {loadError}
            </Notice>
          ) : null}

          {firstLoad ? (
            <div className="ugd-stat" aria-busy="true" aria-label="Loading the eligible students">
              <Skeleton width="40%" height={16} />
              <Skeleton width="30%" height={40} className="ugd-stat__skeleton" />
            </div>
          ) : loaded && !isGlobal ? (
            <div className="ugd-stat">
              <p className="ugd-stat__label">Eligible students</p>
              <p className="ugd-stat__value">{formatNumber(totalEligible)}</p>
              <p className="ugd-stat__context">
                {entityLabel === 'test'
                  ? 'Students in the attached groups can see and take this test.'
                  : 'Students in the attached groups can open and enroll in this cohort.'}
              </p>
            </div>
          ) : null}

          {api.setAccess && loaded ? (
            <section className="ugd-section" aria-labelledby="ugd-access-title">
              <h3 id="ugd-access-title" className="ugd-section__title">
                Who can access this cohort
              </h3>
              <SelectField label="Access" value={accessType} onChange={(event) => startAccessChange(event.target.value)} disabled={busy || loading}>
                <option value="userGroups">Only the attached user groups</option>
                <option value="global">All users (global)</option>
              </SelectField>
              {isGlobal ? (
                <Notice tone="info">
                  Every student on the platform can open and enroll in this cohort, including students who sign up later. The attached user groups are paused until you switch back.
                </Notice>
              ) : null}
            </section>
          ) : null}

          {isGlobal ? null : (
          <>
          <section className="ugd-section" aria-labelledby="ugd-attach-title">
            <h3 id="ugd-attach-title" className="ugd-section__title">
              Attach a user group
            </h3>
            <div className="ugd-attach">
              <SelectField
                label="User group"
                className="ugd-attach__select"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                disabled={busy || loading || available.length === 0}
              >
                <option value="">{nothingToAttach ? 'No groups to attach' : 'Choose a user group'}</option>
                {available.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name} ({formatNumber(group.memberCount)})
                  </option>
                ))}
              </SelectField>
              <Button variant="primary" startIcon={<LinkIcon size={18} weight="regular" aria-hidden="true" />} onClick={attach} disabled={!selectedId || busy} loading={busyAction === 'attach'}>
                Attach group
              </Button>
            </div>
            {noGroupsAtAll ? (
              <Notice tone="info">
                There are no user groups yet.{' '}
                <RouterLink to="/admin/user-groups" onClick={onClose}>
                  Create one
                </RouterLink>
                .
              </Notice>
            ) : nothingToAttach ? (
              <p className="ugd-section__text">Every user group is already attached.</p>
            ) : null}
          </section>

          <section className="ugd-section" aria-labelledby="ugd-attached-title">
            <div className="ugd-section__head">
              <h3 id="ugd-attached-title" className="ugd-section__title">
                Attached groups
              </h3>
              <Badge>{formatNumber(attached.length)}</Badge>
              {attached.length > 0 ? (
                <Button className="ugd-sync" variant="ghost" size="sm" startIcon={<ArrowsClockwiseIcon size={18} weight="regular" aria-hidden="true" />} onClick={sync} disabled={busy} loading={busyAction === 'sync'}>
                  Sync groups
                </Button>
              ) : null}
            </div>
            {attached.length > 0 ? <p className="ugd-section__text">Sync adds the students who joined these groups or registered since the groups were attached.</p> : null}

            {firstLoad ? (
              <div className="ugd-skeleton-rows" role="status" aria-label="Loading the attached groups">
                <Skeleton height={64} radius="var(--ds-radius-md)" />
                <Skeleton height={64} radius="var(--ds-radius-md)" />
              </div>
            ) : loaded && attached.length === 0 ? (
              <EmptyState
                compact
                title="No user groups attached"
                text={entityLabel === 'cohort' ? 'Attach a group to choose who can join. A cohort with no groups can be deleted.' : 'Attach a group to choose who can take this test.'}
              />
            ) : (
              <ul className="ugd-list" aria-label="Attached user groups">
                {attached.map((group) => (
                  <li key={group._id} className="ugd-row">
                    <div className="ugd-row__text">
                      <span className="ugd-row__name">{group.name}</span>
                      {group.description ? <span className="ugd-row__description">{group.description}</span> : null}
                      <span className="ugd-row__meta">
                        <Chip>{pluralize(group.memberCount || 0, 'roll number')}</Chip>
                      </span>
                    </div>
                    <IconButton label={`Detach ${group.name} from this ${entityLabel}`} tone="danger" onClick={() => startDetach(group)} disabled={busy}>
                      <LinkBreakIcon size={20} weight="regular" aria-hidden="true" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(detachPreview)}
        onClose={() => setDetachPreview(null)}
        title={detachPreview?.switchAccess ? 'Limit this cohort to its user groups?' : detachPreview ? `Detach "${detachPreview.group.name}"?` : 'Detach user group'}
        confirmLabel={totals ? 'Remove them and delete their data' : detachPreview?.switchAccess ? 'Limit to user groups' : 'Detach group'}
        onConfirm={() => (detachPreview.switchAccess ? finishAccess('userGroups') : finishDetach(detachPreview.group))}
        danger
        busy={busy}
      >
        {detachPreview ? (
          <div className="ugd-detach">
            <Notice tone="warning">
              {preview.message ? <p>{preview.message}</p> : null}
              {preview.warning ? <p>{preview.warning}</p> : null}
            </Notice>
            <div className="ui-chips">
              <Chip>{pluralize(preview.usersToRemove || 0, 'student')}</Chip>
              {totals ? (
                <>
                  <Chip>{pluralize(totals.submissions || 0, 'submission')}</Chip>
                  <Chip>{pluralize(totals.notes || 0, 'note')}</Chip>
                  <Chip>{pluralize(totals.reports || 0, 'report')}</Chip>
                  <Chip>{pluralize(totals.userProgress || 0, 'progress record')}</Chip>
                </>
              ) : null}
            </div>
            {previewUsers.length > 0 ? (
              <p className="ugd-detach__rolls">
                Students: <span className="ugd-detach__numbers">{previewUsers.slice(0, 12).map((user) => user.rollNumber).join(', ')}</span>
                {previewUsers.length > 12 ? `, and ${formatNumber(previewUsers.length - 12)} more` : ''}
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
