import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import {
  Button,
  Card,
  ConfirmDialog,
  Notice,
  Page,
  PageHeader,
  SearchField,
  Skeleton,
  formatNumber,
} from "../../ui";
import EmptyMark from "./EmptyMark";
import NewResumeDialog from "./NewResumeDialog";
import ResumeCard from "./ResumeCard";
import ResumeDetails from "./ResumeDetails";
import { openEditorInNewTab } from "./openEditor";
import useResumes from "./useResumes";
import "./resumeList.css";

/** Cards shaped like the real ones, while the list loads */
function SkeletonCards() {
  return (
    <div className="ui-grid rbl-grid" role="status" aria-label="Loading your resumes">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="rbl-card" aria-hidden="true">
          <div className="rbl-card__thumb">
            <Skeleton height="auto" radius="var(--ds-radius-lg)" className="rbl-skeleton-sheet" />
          </div>
          <div className="rbl-card__body">
            <Skeleton width="70%" height={20} />
            <Skeleton width="50%" height={16} />
          </div>
          <div className="rbl-card__actions">
            <Skeleton width={132} height={36} radius="var(--ds-radius-pill)" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Build my resume (route /build-resume): the student's resumes as cards with a live thumbnail of
 * the paper, a dialog to start a new one, and a confirmation before deleting. The editor opens in
 * its own tab, as it always has. Operate mode (design/screens.md section 13).
 */
export default function ResumeList() {
  const navigate = useNavigate();
  const { resumes, templates, fonts, limit, loading, failed, reload, create, remove } = useResumes();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const query = search.trim().toLowerCase();
  // Client-side filtering keeps typing instant; the list is capped
  const visible = useMemo(
    () => (query ? resumes.filter((resume) => resume.title.toLowerCase().includes(query)) : resumes),
    [resumes, query],
  );

  const atLimit = resumes.length >= limit;
  const templateOf = (id) => templates.find((item) => item.id === id);
  const fontOf = (id) => fonts.find((item) => item.id === id) || fonts[0];
  const selected = resumes.find((resume) => resume._id === selectedId) || null;

  // The confirmation takes the place of the detail panel, so only one layer is open at a time
  const askDelete = (resume) => {
    setSelectedId(null);
    setToDelete(resume);
  };

  const onCreate = async (title, template) => {
    setCreating(true);
    const id = await create(title, template);
    setCreating(false);
    if (id) {
      setDialogOpen(false);
      openEditorInNewTab(id, (path) => navigate(path));
    }
  };

  const onConfirmDelete = async () => {
    setDeleting(true);
    const removed = await remove(toDelete._id);
    setDeleting(false);
    if (removed) setToDelete(null);
  };

  const newButton = (
    <Button
      variant="primary"
      startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />}
      disabled={loading || failed || atLimit}
      onClick={() => setDialogOpen(true)}
    >
      New resume
    </Button>
  );

  let body;
  if (loading) {
    body = <SkeletonCards />;
  } else if (failed) {
    body = (
      <Card>
        <Notice
          tone="danger"
          title="We could not load your resumes"
          action={
            <Button variant="ghost" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          Check your connection and try again. Nothing was changed.
        </Notice>
      </Card>
    );
  } else if (resumes.length === 0) {
    body = (
      <Card className="rbl-empty">
        <EmptyMark />
        <h2 className="rbl-empty__title">Start your first resume</h2>
        <p className="rbl-empty__text">
          Pick a template, bring in your details from your profile and watch every page update as you
          type.
        </p>
        <Button
          variant="primary"
          startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />}
          onClick={() => setDialogOpen(true)}
        >
          Create a resume
        </Button>
      </Card>
    );
  } else {
    body = (
      <>
        <div className="ui-toolbar rbl-toolbar">
          <p className="rbl-quota">
            <span className="rbl-quota__num">{formatNumber(resumes.length)}</span> of{" "}
            <span className="rbl-quota__num">{formatNumber(limit)}</span> resumes used
          </p>
          <SearchField
            className="ui-toolbar__grow rbl-search"
            value={search}
            onChange={setSearch}
            placeholder="Search by name"
            label="Search resumes"
          />
        </div>

        {atLimit ? (
          <div className="rbl-limit">
            <Notice tone="warning" title={`You have reached the limit of ${formatNumber(limit)} resumes`}>
              Delete one to create another.
            </Notice>
          </div>
        ) : null}

        {visible.length > 0 ? (
          <ul className="ui-grid rbl-grid" aria-label="Your resumes">
            {visible.map((resume) => (
              <li key={resume._id} className="rbl-grid__item">
                <ResumeCard
                  resume={resume}
                  template={templateOf(resume.template)}
                  fontFamily={fontOf(resume.font)?.cssFamily}
                  onOpen={(item) => setSelectedId(item._id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Card className="rbl-none">
            <h2 className="rbl-empty__title">No resume is named like that</h2>
            <p className="rbl-empty__text">Nothing matches “{search.trim()}”. Try a shorter name.</p>
            <Button onClick={() => setSearch("")}>Clear search</Button>
          </Card>
        )}
      </>
    );
  }

  return (
    <Page className="rbl">
      <PageHeader
        size="display"
        title="Build my resume"
        description="Pick a template, bring in your profile details and preview every page as you write."
        actions={newButton}
      />

      {body}

      <NewResumeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        templates={templates}
        busy={creating}
        onCreate={onCreate}
      />

      <ResumeDetails
        resume={selected}
        template={selected ? templateOf(selected.template) : undefined}
        font={selected ? fontOf(selected.font) : undefined}
        onClose={() => setSelectedId(null)}
        onDelete={askDelete}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={toDelete ? `Delete “${toDelete.title}”?` : "Delete resume?"}
        description="It will be deleted for good, along with everything you have written in it. This cannot be undone."
        confirmLabel="Delete resume"
        danger
        busy={deleting}
        onConfirm={onConfirmDelete}
      />
    </Page>
  );
}
