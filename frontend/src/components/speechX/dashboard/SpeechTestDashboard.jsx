import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FunnelXIcon } from "@phosphor-icons/react/dist/csr/FunnelX";
import { Button, EmptyState, Notice, Page, PageHeader, PillTabs, SearchField, Toolbar } from "../../ui";
import SpeakingFilm from "../../custom-components/SpeakingFilm";
import { enterFullscreen } from "../../../utils/fullscreen";
import { Reveal, examStatusOf, normalizeQuery, testMatchesQuery } from "../shared";
import TestCard, { TestCardSkeleton } from "./TestCard";
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

/** Cards shaped like the real ones, while the list loads. */
const LoadingGrid = () => (
  <ul className="sxd-grid" role="status" aria-label="Loading your VocalQ tests">
    {[0, 1, 2, 3].map((key) => (
      <li key={key} className="sxd-cell">
        <TestCardSkeleton />
      </li>
    ))}
  </ul>
);

/**
 * Student-side list of scheduled speech tests (route /speech-tests).
 *
 * A title, a search at the left with the status filter at its right, then one card per test in the
 * style of the cohort cards (status, name, description, size, schedule, progress). Pressing a card
 * opens a drawer from the right with all the details and, when the test is available, the button
 * to start or continue it.
 * With no test scheduled it shows the speaking film (custom-components/SpeakingFilm) and a sentence.
 */
const SpeechTestDashboard = () => {
  const navigate = useNavigate();
  const { tests, loading, error, retry, serverNow, stateOf } = useSpeechTests();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // A test already started reopens directly. A new one begins with the instructions screen; the
  // attempt is created only after the student confirms.
  const open = (test) => {
    // Entering the test: ask for full screen in this click, a browser allows it only after a click or a key press
    enterFullscreen();
    navigate(test.attempt ? `/speech-tests/${test._id}` : `/speech-tests/${test._id}/setup`);
  };

  const filterOf = (test) => filterKeyOf(examStatusOf(stateOf(test), test.attempt));
  const query = normalizeQuery(search);
  const visible = tests.filter((test) => (filter === "all" || filterOf(test) === filter) && testMatchesQuery(test, query));
  const filtersOn = filter !== "all" || query !== "";
  const clearFilters = () => {
    setFilter("all");
    setSearch("");
  };

  // How many tests each status holds (the search does not change these)
  const counts = useMemo(() => {
    const result = { all: tests.length, live: 0, upcoming: 0, completed: 0, missed: 0 };
    tests.forEach((test) => {
      result[filterKeyOf(examStatusOf(stateOf(test), test.attempt))] += 1;
    });
    return result;
  }, [tests, stateOf]);
  const filterItems = FILTERS.map((option) => ({
    key: option.key,
    label: (
      <>
        {option.label}
        <span className="sxd-count">{counts[option.key]}</span>
      </>
    ),
  }));
  const selected = tests.find((test) => test._id === selectedId) || null;

  let content;
  if (loading) {
    content = <LoadingGrid />;
  } else if (error && tests.length === 0) {
    content = (
      <Notice
        tone="danger"
        title="Could not load your VocalQ tests"
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
    // Nothing scheduled: the speaking film (a face that speaks and becomes a waveform) above the message
    content = (
      <div className="sxd-empty">
        <SpeakingFilm className="sxd-empty__film" />
        <h3 className="sxd-empty__title">No VocalQ tests yet</h3>
        <p className="sxd-empty__text">When your teacher schedules a communication test for you, it will show up here.</p>
      </div>
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={<FunnelXIcon size={28} aria-hidden="true" />}
        title="No tests match"
        text="Try a different search or another status."
        action={
          <Button variant="primary" onClick={clearFilters}>
            Clear filters
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
      <PageHeader title="VocalQ" description="Speak, read, repeat and write. Your recorded answers are scored automatically." size="display" />

      <section className="sxd-list" aria-labelledby="sxd-tests-title">
        <h2 id="sxd-tests-title" className="sx-sr">
          Your tests
        </h2>
        {!loading && tests.length > 0 ? (
          <Toolbar
            className="sxd-filters"
            label="Filter tests"
            search={<SearchField value={search} onChange={setSearch} placeholder="Search tests or sections" label="Search tests by name, description or section" />}
          >
            {filtersOn ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
            <PillTabs items={filterItems} value={filter} onChange={setFilter} label="Show tests by status" size="sm" role="radiogroup" />
          </Toolbar>
        ) : null}
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
