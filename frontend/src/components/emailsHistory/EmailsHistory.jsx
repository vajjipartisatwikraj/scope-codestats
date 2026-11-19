import React, { useEffect, useRef, useState } from 'react';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/csr/EnvelopeSimple';
import { FunnelXIcon } from '@phosphor-icons/react/dist/csr/FunnelX';
import useAutoHideScrollbars from '../../hooks/useAutoHideScrollbars';
import useMediaQuery from '../../hooks/useMediaQuery';
import { AdminTop, Badge, Button, EmptyState, Notice, Page, Pagination, SearchField, SelectField, SkeletonRows, StatGrid, StatTile, pluralize } from '../ui';
import EmailDetail from './EmailDetail';
import EmailList from './EmailList';
import { STATUS_FILTERS, TYPE_FILTERS } from './emailFormat';
import useEmailsHistory from './useEmailsHistory';
import './emailsHistory.css';

/**
 * Emails history (route /admin/emails-history, admins only): every email the platform sent to a
 * person, and how it went: coding profiles removed (components/suspendAccounts), teacher requests and
 * role changes (components/manageUsers). Each one is recorded in the `emailsHistory` collection when
 * it is sent, with the status sending, sent or failed.
 *
 * design/screens.md section 16: the fixed admin top (title with the count, the tagline, a Refresh
 * button; then the search at the left and the two dropdowns at the right), the figures that matter
 * first (sent and failed), then the band table with no box around it, and pagination. A row opens
 * the kit's detail panel with the email as the student saw it. Below 900px the table is rows.
 */
export default function EmailsHistory() {
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const compact = useMediaQuery('(max-width: 899.95px)');
  const data = useEmailsHistory();
  const { emails, total, totals, loading, error, search, status, type } = data;
  const [openingId, setOpeningId] = useState(null);
  const [selected, setSelected] = useState(null);
  const bodyRef = useRef(null);

  // A shorter list (a filter, a search) can leave the page number past the end
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(total / data.pageSize));
    if (!loading && data.page > pages) data.setPage(pages);
  }, [total, data.pageSize, data.page, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (email) => {
    setOpeningId(email._id);
    const result = await data.open(email._id);
    setOpeningId(null);
    if (result.ok) setSelected(result.email);
  };

  const firstLoad = loading && emails.length === 0 && !error;
  const filtered = Boolean(search) || status !== 'all' || type !== 'all';
  const clearFilters = () => {
    data.setQuery('');
    data.setStatus('all');
    data.setType('all');
  };

  let body;
  if (firstLoad) {
    body = <SkeletonRows count={6} height={compact ? 120 : 64} />;
  } else if (error) {
    body = (
      <Notice
        tone="danger"
        title="We could not load the emails"
        action={
          <Button variant="ghost" size="sm" onClick={data.load}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (emails.length === 0 && filtered) {
    body = (
      <EmptyState
        icon={<FunnelXIcon size={28} weight="regular" />}
        title="No emails match"
        text="Nothing fits this search and these filters. Try different words, or show every status and kind."
        action={<Button onClick={clearFilters}>Clear filters</Button>}
      />
    );
  } else if (emails.length === 0) {
    body = (
      <EmptyState
        icon={<EnvelopeSimpleIcon size={28} weight="regular" />}
        title="No emails have been sent yet"
        text="When you remove a student's coding accounts and choose to email them, the email is listed here with its status."
      />
    );
  } else {
    body = <EmailList emails={emails} compact={compact} openingId={openingId} onOpen={open} />;
  }

  return (
    <Page className="eh">
      <AdminTop
        title="Emails history"
        count={loading || error ? undefined : pluralize(total, 'email')}
        description="Every email the platform sent to a person, and whether it went."
        actions={
          <Button onClick={data.load} loading={loading && !firstLoad}>
            Refresh
          </Button>
        }
        label="Search emails and filter them"
        search={<SearchField value={data.query} onChange={data.setQuery} label="Search emails" placeholder="Search by name, address or subject" />}
        filters={
          <>
            <SelectField variant="pill" aria-label="Show status" value={status} onChange={(event) => data.setStatus(event.target.value)} options={STATUS_FILTERS} />
            <SelectField variant="pill" aria-label="Show kind of email" value={type} onChange={(event) => data.setType(event.target.value)} options={TYPE_FILTERS} />
          </>
        }
      />

      <StatGrid label="Emails by status" className="eh-stats">
        <StatTile
          size="m"
          label="Sent"
          value={totals.sent}
          context={<span>Accepted by the mail server</span>}
        />
        <StatTile
          size="m"
          label="Failed"
          value={totals.failed}
          context={totals.failed > 0 ? <Badge tone="danger">Check the reason in each row</Badge> : <span>None failed</span>}
        />
      </StatGrid>

      <div ref={bodyRef} className="eh-body" aria-busy={loading}>
        {body}
      </div>

      {!firstLoad && !error && total > 10 ? (
        <Pagination page={data.page} pageSize={data.pageSize} total={total} onPage={data.setPage} onPageSize={data.setPageSize} />
      ) : null}

      <EmailDetail email={selected} onClose={() => setSelected(null)} />
    </Page>
  );
}
