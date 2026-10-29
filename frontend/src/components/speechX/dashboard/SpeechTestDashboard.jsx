import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { Button, EmptyState, Notice, Page, PageHeader, PillTabs, Skeleton } from "../../ui";
import { Reveal, examStatusOf } from "../shared";
import TestCard from "./TestCard";
import TestDetails from "./TestDetails";
import useSpeechTests from "./useSpeechTests";
import "./dashboard.css";

/** The status filter. "Missed" is a window that closed without the student finishing. */
const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "missed", label: "Missed" },
];

const filterKeyOf = (status) => {
  if (status === "live" || status === "upcoming" || status === "completed") return status;
  return "missed";
};

/** Containers shaped like the real ones, while the list loads. */
const LoadingGrid = () => (
  <ul className="sxd-grid" role="status" aria-label="Loading your speech tests">
    {[0, 1, 2].map((key) => (
      <li key={key} className="sxd-cell">
        <div className="sxd-item sxd-item--skeleton">
          <Skeleton width="60%" height={20} />
          <Skeleton width="85%" height={14} />
        </div>
      </li>
    ))}
  </ul>
);

/**
 * Student-side list of scheduled speech tests (route /speech-tests).
 *
 * A title, then "Your tests" with a status filter at its right and one simple container per test
 * (name, time, status). Pressing a container opens a drawer from the right with all the details
 * and, when the test is available, the button to start or continue it.
 * The data, polling and the server clock are in useSpeechTests.
 */
const SpeechTestDashboard = () => {
  const navigate = useNavigate();
  const { tests, loading, error, retry, serverNow, stateOf } = useSpeechTests();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  // A test already started reopens directly. A new one begins with the instructions screen; the
  // attempt is created only after the student confirms.
  const open = (test) => {
    navigate(test.attempt ? `/speech-tests/${test._id}` : `/speech-tests/${test._id}/setup`);
  };

  const filterOf = (test) => filterKeyOf(examStatusOf(stateOf(test), test.attempt));
  const visible = filter === "all" ? tests : tests.filter((test) => filterOf(test) === filter);
  const selected = tests.find((test) => test._id === selectedId) || null;

  let content;
  if (loading) {
    content = <LoadingGrid />;
  } else if (error && tests.length === 0) {
    content = (
      <Notice
        tone="danger"
        title="Could not load your speech tests"
        action={
          <Button variant="ghost" size="sm" onClick={retry}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (tests.length === 0) {
    content = (
      <EmptyState
        icon={<MicrophoneIcon size={28} aria-hidden="true" />}
        title="No speech tests yet"
        text="When your teacher schedules a communication test for you, it will show up here."
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={<MicrophoneIcon size={28} aria-hidden="true" />}
        title="No tests with this status"
        text="Choose another status to see your other tests."
        action={
          <Button variant="secondary" onClick={() => setFilter("all")}>
            Show all tests
          </Button>
        }
      />
    );
  } else {
    content = (
      <ul className="sxd-grid">
        {visible.map((test, index) => (
          <Reveal as="li" key={test._id} index={index} className="sxd-cell">
            <TestCard test={test} state={stateOf(test)} onOpen={() => setSelectedId(test._id)} />
          </Reveal>
        ))}
      </ul>
    );
  }

  return (
    <Page>
      <PageHeader title="My speech tests" size="display" />

      <section className="sxd-list" aria-labelledby="sxd-tests-title">
        <div className="sxd-list__head">
          <h2 id="sxd-tests-title" className="sxd-list__title">
            Your tests
          </h2>
          {!loading && tests.length > 0 ? (
            <PillTabs items={FILTERS} value={filter} onChange={setFilter} label="Filter tests by status" size="sm" role="radiogroup" />
          ) : null}
        </div>
        {content}
      </section>

      <TestDetails
        test={selected}
        state={selected ? stateOf(selected) : "upcoming"}
        serverNow={serverNow}
        onClose={() => setSelectedId(null)}
        onOpenTest={() => selected && open(selected)}
        onLeaderboard={() => selected && navigate(`/speech-tests/${selected._id}/leaderboard`)}
      />
    </Page>
  );
};

export default SpeechTestDashboard;
