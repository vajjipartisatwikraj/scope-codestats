import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { UploadSimpleIcon } from "@phosphor-icons/react/dist/csr/UploadSimple";
import { AdminTop, Button, Card, ConfirmDialog, EmptyState, Notice, Page, SearchField, SelectField, Skeleton, pluralize } from "../../ui";
import { normalizeQuery, testMatchesQuery } from "../shared";
import AdminTestCard from "./AdminTestCard";
import CommunicationTestStudentsDialog from "./CommunicationTestStudentsDialog";
import { downloadTestFile, readImportFile, toDuplicatePayload } from "./testTransfer";
import { adminApi, apiErrorMessage } from "../../../services/speechTestApi";
import "./speechAdmin.css";

const SHOW_OPTIONS = [
  { value: "all", label: "All tests" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
];

/**
 * Teacher / admin page (route /admin/communication-tests): every communication test as a card, with
 * the actions for it. Create, edit, students, results, publish or hide, duplicate, download as JSON,
 * import from JSON and delete (behind a confirmation).
 *
 * Added to the old page: a search and a Published / Drafts filter (on the client) and a retry when the
 * list cannot be loaded.
 */
const CommunicationTestManagement = () => {
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [studentsFor, setStudentsFor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [judge, setJudge] = useState(null);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState("all");

  const load = useCallback(async () => {
    try {
      const data = await adminApi.list();
      setTests(data.tests || []);
      setFailed(false);
    } catch (error) {
      setFailed(true);
      toast.error(apiErrorMessage(error, "Could not load communication tests"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    adminApi
      .judgeStatus()
      .then(setJudge)
      .catch(() => setJudge({ configured: false, error: "Could not check the speech judge" }));
  }, [load]);

  const retry = () => {
    setLoading(true);
    load();
  };

  /** Runs an action with the page locked, turning a failure into a toast. */
  const run = async (action, fallback) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      const problems = error?.response?.data?.problems;
      toast.error(
        error?.response
          ? problems?.length
            ? `${apiErrorMessage(error)}: ${problems.join("; ")}`
            : apiErrorMessage(error, fallback)
          : error.message || fallback
      );
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = (test) =>
    run(async () => {
      await adminApi.publish(test._id, !test.isPublished);
      toast.success(test.isPublished ? "Test hidden from students" : "Test published to eligible students");
      await load();
    }, "Could not update");

  const duplicate = (test) =>
    run(async () => {
      const { test: full } = await adminApi.get(test._id);
      await adminApi.create(toDuplicatePayload(full));
      toast.success("Duplicated as a draft. Check its schedule and add students.");
      await load();
    }, "Could not duplicate the test");

  const exportJson = (test) =>
    run(async () => {
      const { test: full } = await adminApi.get(test._id);
      downloadTestFile(full);
    }, "Could not download the test");

  const importJson = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    run(async () => {
      const { test } = await adminApi.create(await readImportFile(file));
      toast.success("Imported as a draft. Check its schedule and add students.");
      navigate(`/admin/communication-tests/${test._id}/edit`);
    }, "Could not import the file");
  };

  const confirmDelete = () =>
    run(async () => {
      await adminApi.remove(deleting._id);
      toast.success("Test deleted");
      setDeleting(null);
      await load();
    }, "Could not delete the test");

  const judgeProblem = judge && (!judge.configured || judge.error || (judge.ready && judge.ready.ready === false));

  const filtering = Boolean(search.trim() || show !== "all");
  const visible = useMemo(() => {
    const term = normalizeQuery(search);
    return tests.filter((test) => {
      if (show === "published" && !test.isPublished) return false;
      if (show === "draft" && test.isPublished) return false;
      return testMatchesQuery(test, term);
    });
  }, [tests, search, show]);

  const clearFilters = () => {
    setSearch("");
    setShow("all");
  };

  const goNew = () => navigate("/admin/communication-tests/new");
  const pickFile = () => fileInput.current?.click();

  const activeFilters = [
    show !== "all" ? (show === "draft" ? "drafts" : "published tests") : null,
    search.trim() ? `\u201c${search.trim()}\u201d` : null,
  ].filter(Boolean);

  let body;
  if (loading) {
    body = (
      <div className="sxa-grid" aria-busy="true" aria-label="Loading communication tests">
        {[0, 1, 2].map((key) => (
          <Card key={key}>
            <Skeleton height={24} width="40%" radius="var(--ds-radius-pill)" />
            <Skeleton height={28} width="70%" className="sxa-skeleton-gap" />
            <Skeleton height={16} width="90%" className="sxa-skeleton-gap" />
            <Skeleton height={64} className="sxa-skeleton-gap" radius="var(--ds-radius-lg)" />
            <Skeleton height={36} width="60%" className="sxa-skeleton-gap" radius="var(--ds-radius-pill)" />
          </Card>
        ))}
      </div>
    );
  } else if (failed && tests.length === 0) {
    body = (
      <Card>
        <Notice
          tone="danger"
          title="We could not load the communication tests"
          action={
            <Button variant="ghost" size="sm" onClick={retry}>
              Retry
            </Button>
          }
        >
          Check your connection and try again. Nothing was changed.
        </Notice>
      </Card>
    );
  } else if (tests.length === 0) {
    body = (
      <Card>
        <EmptyState
          icon={<MicrophoneIcon size={28} aria-hidden="true" />}
          title="No communication tests yet"
          text="Use New test or Import JSON above to add the first one."
        />
      </Card>
    );
  } else if (visible.length === 0) {
    body = (
      <Card>
        <EmptyState
          title="No tests match"
          text={`Nothing matches ${activeFilters.join(" and ")}.`}
          action={
            <Button onClick={clearFilters}>Clear filters</Button>
          }
        />
      </Card>
    );
  } else {
    body = (
      <ul className="sxa-grid" aria-label="Communication tests">
        {visible.map((test) => (
          <li key={test._id} className="sxa-grid__item">
            <AdminTestCard
              test={test}
              busy={busy}
              onEdit={() => navigate(`/admin/communication-tests/${test._id}/edit`)}
              onResults={() => navigate(`/admin/communication-tests/${test._id}/results`)}
              onStudents={() => setStudentsFor(test._id)}
              onTogglePublish={togglePublish}
              onDuplicate={duplicate}
              onExport={exportJson}
              onDelete={setDeleting}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Page className="sxa-page">
      <AdminTop
        title="Communication tests"
        count={!loading && !failed ? pluralize(tests.length, "test") : undefined}
        description="Schedule speaking tests for your students; the speech judge scores them."
        actions={
          <>
            <Button startIcon={<UploadSimpleIcon size={18} aria-hidden="true" />} onClick={pickFile} disabled={busy}>
              Import JSON
            </Button>
            <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={goNew}>
              New test
            </Button>
          </>
        }
        label="Search and filter communication tests"
        search={
          (
            <SearchField value={search} onChange={setSearch} placeholder="Search tests or sections" label="Search communication tests by name, description or section" />
          )
        }
        filters={
          (
            <>
              <SelectField variant="pill" aria-label="Show" value={show} onChange={(event) => setShow(event.target.value)} options={SHOW_OPTIONS} />
              {filtering ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null}
            </>
          )
        }
      />      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={importJson}
      />
      <p className="ui-sr" role="status">
        {busy ? "Working…" : ""}
      </p>

      {judgeProblem ? (
        <Notice tone="warning" title="The speech judge needs attention" className="sxa-judge">
          {!judge.configured
            ? "The speech judge is not configured on the server (SPEECHJUDGE_API_KEY is missing). Students can take tests but sections will not be scored."
            : judge.error
            ? `The speech judge could not be reached: ${judge.error}`
            : "The speech judge is still loading its models. Scoring will be delayed until it is ready."}
        </Notice>
      ) : null}

      {body}

      <CommunicationTestStudentsDialog
        open={Boolean(studentsFor)}
        testId={studentsFor}
        onClose={() => {
          setStudentsFor(null);
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        busy={busy}
        danger
        title="Delete this test?"
        description={`This permanently deletes the test and every student's attempt and score${
          deleting?.attemptCount ? ` (${pluralize(deleting.attemptCount, "attempt")})` : ""
        }. It cannot be undone.`}
        confirmLabel="Delete test"
        onConfirm={confirmDelete}
      >
        {deleting ? <p className="sxa-delete-name">{deleting.title}</p> : null}
      </ConfirmDialog>
    </Page>
  );
};

export default CommunicationTestManagement;
