import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { BooksIcon } from '@phosphor-icons/react/dist/csr/Books';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { Badge, Button, Checkbox, EmptyState, Notice, SearchField, SkeletonRows } from '../../ui';
import { useAuth } from '../../../contexts/AuthContext';
import * as api from '../api/bankLibraryApi';
import useDebounced from '../hooks/useDebounced';
import useLibraryRequest from '../hooks/useLibraryRequest';
import { DIFFICULTY_TONE, TYPE_LABEL, apiMessage, countOf, difficultyLabel, isNotConfigured, summariseChoice } from '../model/bankLibrary';
import './picker.css';

/** Why a request failed, with a way to try again; a library that is not set up gets its own words */
function LoadNotice({ error, onRetry }) {
  if (isNotConfigured(error)) {
    return (
      <Notice tone="info" title="The bank library is not set up yet">
        Ask an administrator to connect its storage bucket.
      </Notice>
    );
  }
  return (
    <Notice
      tone="danger"
      title="The bank library did not load"
      action={
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {apiMessage(error, 'Check your connection and try again.')}
    </Notice>
  );
}

/** One result the person can open: a title, a line under it, and what it is */
function PickRow({ title, meta, kind, onClick }) {
  return (
    <li>
      <button type="button" className="blp-pick" onClick={onClick}>
        <span className="blp-pick__text">
          <span className="blp-pick__title">{title}</span>
          {meta ? <span className="blp-pick__meta">{meta}</span> : null}
        </span>
        {kind ? <Badge tone="neutral">{kind}</Badge> : null}
      </button>
    </li>
  );
}

// ---- Step 1: find a bank ---------------------------------------------------------------------------------------

function BanksStep({ mode, onOpen }) {
  const { token } = useAuth();
  const [text, setText] = useState('');
  const query = useDebounced(text.trim(), 250);
  const searching = query.length >= 2;

  const banks = useLibraryRequest(() => api.listBanks(token), [token], { skip: searching });
  const found = useLibraryRequest(() => api.searchLibrary(token, query), [token, query], { skip: !searching });

  let body;
  if (searching) {
    if (found.loading && !found.data) body = <SkeletonRows count={4} height={64} />;
    else if (found.error) body = <LoadNotice error={found.error} onRetry={found.reload} />;
    else {
      const result = found.data || { banks: [], topics: [], questions: [] };
      const questions = mode === 'topics' || mode === 'topic' ? [] : result.questions;
      if (result.banks.length + result.topics.length + questions.length === 0) {
        body = <EmptyState compact icon={<MagnifyingGlassIcon size={28} weight="regular" />} title="Nothing matches" text={`No bank, topic or question is called \u201c${query}\u201d.`} />;
      } else {
        body = (
          <div className="blp-results">
            {result.banks.length > 0 ? (
              <section aria-label="Banks">
                <h4 className="blp-group">Banks</h4>
                <ul className="blp-list">
                  {result.banks.map((bank) => (
                    <PickRow key={bank.id} title={bank.name} meta={`${countOf(bank.topicCount, 'topic')} \u00b7 ${countOf(bank.questionCount, 'question')}`} onClick={() => onOpen(bank.id)} />
                  ))}
                </ul>
              </section>
            ) : null}
            {result.topics.length > 0 ? (
              <section aria-label="Topics">
                <h4 className="blp-group">Topics</h4>
                <ul className="blp-list">
                  {result.topics.map((topic) => (
                    <PickRow key={topic.id} title={topic.name} meta={`In ${topic.bankName} \u00b7 ${countOf(topic.questionCount, 'question')}`} onClick={() => onOpen(topic.bankId, { topicId: topic.id })} />
                  ))}
                </ul>
              </section>
            ) : null}
            {questions.length > 0 ? (
              <section aria-label="Questions">
                <h4 className="blp-group">Questions</h4>
                <ul className="blp-list">
                  {questions.map((question) => (
                    <PickRow key={question.id} title={question.title} meta={`In ${question.bankName} \u203a ${question.topicName}`} kind={TYPE_LABEL[question.type]} onClick={() => onOpen(question.bankId, { topicId: question.topicId, questionId: question.id })} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        );
      }
    }
  } else if (banks.loading && !banks.data) {
    body = <SkeletonRows count={4} height={64} />;
  } else if (banks.error) {
    body = <LoadNotice error={banks.error} onRetry={banks.reload} />;
  } else if (!banks.data || banks.data.length === 0) {
    body = <EmptyState compact icon={<BooksIcon size={28} weight="regular" />} title="No banks yet" text="Banks are added in the bank library by an administrator, and teachers see them once they are published." />;
  } else {
    body = (
      <ul className="blp-list" aria-label="Banks">
        {banks.data.map((bank) => (
          <PickRow
            key={bank.id}
            title={bank.name}
            meta={`${countOf(bank.topicCount, 'topic')} \u00b7 ${countOf(bank.questionCount, 'question')}${bank.description ? ` \u00b7 ${bank.description}` : ''}`}
            onClick={() => onOpen(bank.id)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="blp-step">
      <SearchField value={text} onChange={setText} placeholder={mode === 'topics' || mode === 'topic' ? 'Search banks and topics' : 'Search banks, topics and questions'} label="Search the bank library" />
      {body}
    </div>
  );
}

// ---- Step 2: choose topics and questions in a bank ------------------------------------------------------------------

function QuestionRows({ mode, bankId, topicChosen, state, filter, chosen, onToggle, onRetry }) {
  if (!state || state.loading) return <SkeletonRows count={3} height={44} />;
  if (state.error) return <LoadNotice error={state.error} onRetry={onRetry} />;
  const term = filter.trim().toLowerCase();
  const items = term ? state.items.filter((item) => item.title.toLowerCase().includes(term)) : state.items;
  if (state.items.length === 0) return <p className="blp-note">This topic has no questions yet.</p>;
  if (items.length === 0) return <p className="blp-note">No question in this topic matches the search.</p>;

  return (
    <ul className="blp-questions" aria-label="Questions">
      {items.map((item) => {
        const checked = topicChosen || chosen.has(item.id);
        return (
          <li key={item.id}>
            <label className="blp-q" data-checked={checked ? 'true' : 'false'} data-disabled={topicChosen ? 'true' : 'false'}>
              <input
                type={mode === 'question' ? 'radio' : 'checkbox'}
                name={`blp-question-${bankId}`}
                className="blp-q__input"
                checked={checked}
                disabled={topicChosen}
                onChange={() => onToggle(item)}
              />
              <span className="blp-q__text">
                <span className="blp-q__title">{item.title}</span>
                <span className="blp-q__meta">
                  {TYPE_LABEL[item.type] || item.type}
                  {item.marks ? ` \u00b7 ${item.marks} marks` : ''}
                  {topicChosen ? ' \u00b7 comes with the topic' : ''}
                </span>
              </span>
              <Badge tone={DIFFICULTY_TONE[item.difficultyLevel] || 'neutral'}>{difficultyLabel(item.difficultyLevel)}</Badge>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function BankStep({ mode, bankId, focus, canGoBack, onBack, onChange }) {
  const { token } = useAuth();
  const bank = useLibraryRequest(() => api.getBank(token, bankId), [token, bankId]);
  const topics = useMemo(() => bank.data?.topics || [], [bank.data]);

  const [selectedTopics, setSelectedTopics] = useState(() => new Set());
  const [selectedQuestions, setSelectedQuestions] = useState(() => new Map());
  const [expanded, setExpanded] = useState(() => new Set(focus?.topicId ? [focus.topicId] : []));
  const [questionsOf, setQuestionsOf] = useState({}); // topic id -> { loading, error, items }
  const [filter, setFilter] = useState('');

  const loadQuestions = useCallback(
    async (topicId) => {
      setQuestionsOf((previous) => ({ ...previous, [topicId]: { loading: true, items: [] } }));
      try {
        const items = await api.listQuestions(token, bankId, topicId);
        setQuestionsOf((previous) => ({ ...previous, [topicId]: { loading: false, items } }));
        return items;
      } catch (error) {
        setQuestionsOf((previous) => ({ ...previous, [topicId]: { loading: false, error, items: [] } }));
        return [];
      }
    },
    [token, bankId]
  );

  // First time the bank is on screen: start from what the person came for
  const started = useRef(false);
  useEffect(() => {
    if (!bank.data || started.current) return;
    started.current = true;
    const topicId = focus?.topicId;
    if (mode === 'topics') {
      // Importing a bank starts with every topic chosen; a topic found by search starts alone
      setSelectedTopics(new Set(topicId ? [topicId] : bank.data.topics.filter((topic) => topic.questionCount > 0).map((topic) => topic.id)));
    } else if (topicId && !focus.questionId) {
      setSelectedTopics(new Set([topicId]));
    }
    if (topicId && (mode === 'selection' || mode === 'question')) {
      loadQuestions(topicId).then((items) => {
        const hit = focus.questionId && items.find((item) => item.id === focus.questionId);
        if (hit) setSelectedQuestions(new Map([[hit.id, { id: hit.id, topicId, title: hit.title }]]));
      });
    }
  }, [bank.data, focus, mode, loadQuestions]);

  const toggleTopic = (topicId) =>
    setSelectedTopics((previous) => {
      // One topic at a time when the picker is for a single topic
      if (mode === 'topic') return new Set([topicId]);
      const next = new Set(previous);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });

  const toggleExpanded = (topicId) => {
    const opening = !expanded.has(topicId);
    setExpanded((previous) => {
      const next = new Set(previous);
      if (opening) next.add(topicId);
      else next.delete(topicId);
      return next;
    });
    if (opening && !questionsOf[topicId]) loadQuestions(topicId);
  };

  const toggleQuestion = (topicId) => (item) =>
    setSelectedQuestions((previous) => {
      // Choosing a question for the form replaces the earlier choice; choosing for an import adds to the set
      if (mode === 'question') return new Map([[item.id, { id: item.id, topicId, title: item.title }]]);
      const next = new Map(previous);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, { id: item.id, topicId, title: item.title });
      return next;
    });

  const selectAll = () => setSelectedTopics(new Set(topics.filter((topic) => topic.questionCount > 0).map((topic) => topic.id)));
  const clearAll = () => {
    setSelectedTopics(new Set());
    setSelectedQuestions(new Map());
  };

  // What is chosen, told to whoever opened the picker
  const choice = useMemo(() => {
    if (!bank.data) return null;
    if (mode === 'question') {
      const only = [...selectedQuestions.values()][0];
      return only ? { bankId, bankName: bank.data.name, topicId: only.topicId, questionId: only.id, title: only.title } : null;
    }
    if (mode === 'topic') {
      const topic = topics.find((entry) => selectedTopics.has(entry.id));
      return topic ? { bankId, bankName: bank.data.name, topicId: topic.id, topicName: topic.name, topicDescription: topic.description, questionCount: topic.questionCount } : null;
    }
    const summary = summariseChoice(topics, selectedTopics, selectedQuestions);
    return summary.questionCount > 0 ? { bankId, bankName: bank.data.name, bankDescription: bank.data.description, ...summary } : null;
  }, [bank.data, bankId, mode, topics, selectedTopics, selectedQuestions]);

  const report = useRef(onChange);
  report.current = onChange;
  useEffect(() => {
    report.current(choice);
  }, [choice]);

  if (bank.loading && !bank.data) return <SkeletonRows count={5} height={56} />;
  if (bank.error) return <LoadNotice error={bank.error} onRetry={bank.reload} />;

  const term = filter.trim().toLowerCase();
  const visible = topics.filter((topic) => {
    if (!term) return true;
    if (topic.name.toLowerCase().includes(term)) return true;
    return (questionsOf[topic.id]?.items || []).some((item) => item.title.toLowerCase().includes(term));
  });

  return (
    <div className="blp-step">
      <header className="blp-head">
        {canGoBack ? (
          <Button variant="ghost" size="sm" startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={onBack}>
            All banks
          </Button>
        ) : null}
        <div className="blp-head__text">
          <h3 className="blp-head__title">{bank.data.name}</h3>
          <p className="blp-head__meta">{`${countOf(bank.data.topicCount, 'topic')} \u00b7 ${countOf(bank.data.questionCount, 'question')}`}</p>
        </div>
      </header>

      {topics.length === 0 ? (
        <EmptyState compact icon={<BooksIcon size={28} weight="regular" />} title="This bank has no topics yet" text="Topics are added to a bank in the bank library." />
      ) : (
        <>
          <div className="blp-tools">
            <SearchField value={filter} onChange={setFilter} placeholder={mode === 'topics' || mode === 'topic' ? 'Search topics' : 'Search topics and questions'} label="Search the topics of this bank" />
            {mode === 'topics' || mode === 'selection' ? (
              <div className="blp-tools__actions">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select all topics
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear
                </Button>
              </div>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <EmptyState compact icon={<MagnifyingGlassIcon size={28} weight="regular" />} title="No topic matches" text="Try another word, or clear the search." />
          ) : (
            <ul className="blp-topics" aria-label="Topics">
              {visible.map((topic) => {
                const open = expanded.has(topic.id);
                const topicChosen = selectedTopics.has(topic.id);
                const label = (
                  <span className="blp-topic__name">
                    <span className="blp-topic__title">{topic.name}</span>
                    <span className="blp-topic__meta">{countOf(topic.questionCount, 'question')}</span>
                  </span>
                );
                return (
                  <li key={topic.id} className="blp-topic" data-open={open ? 'true' : 'false'}>
                    <div className="blp-topic__row">
                      {mode === 'question' ? (
                        label
                      ) : mode === 'topic' ? (
                        <label className="blp-radio" data-checked={topicChosen ? 'true' : 'false'}>
                          <input type="radio" name={`blp-topic-${bankId}`} className="blp-q__input" checked={topicChosen} onChange={() => toggleTopic(topic.id)} />
                          {label}
                        </label>
                      ) : (
                        <Checkbox className="blp-topic__check" checked={topicChosen} disabled={topic.questionCount === 0} onChange={() => toggleTopic(topic.id)} label={label} />
                      )}
                      {(mode === 'selection' || mode === 'question') && topic.questionCount > 0 ? (
                        <button type="button" className="blp-topic__toggle" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} the questions of ${topic.name}`} onClick={() => toggleExpanded(topic.id)}>
                          <span>Questions</span>
                          <CaretDownIcon size={16} weight="bold" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    {open ? (
                      <QuestionRows
                        mode={mode}
                        bankId={bankId}
                        topicChosen={topicChosen}
                        state={questionsOf[topic.id]}
                        filter={filter}
                        chosen={selectedQuestions}
                        onToggle={toggleQuestion(topic.id)}
                        onRetry={() => loadQuestions(topic.id)}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * BankPicker: finds things in the bank library and tells you what was chosen. The same picker is used
 * wherever content is imported into a cohort.
 *
 *   mode      'topics'     a bank and the topics of it (importing a bank: every topic starts chosen)
 *             'selection'  topics and single questions of one bank (importing into a module)
 *             'topic'      exactly one topic (filling the add module form)
 *             'question'   exactly one question (filling the question form)
 *   onChange(choice)   called whenever the choice changes; null while nothing is chosen
 *               topics / selection: { bankId, bankName, bankDescription, topicIds, questionIds, topicCount, questionCount, allTopics }
 *               topic:              { bankId, bankName, topicId, topicName, topicDescription, questionCount }
 *               question:           { bankId, bankName, topicId, questionId, title }
 *   lockBankId   open this bank at once and do not offer the list of banks
 *
 * Step one finds a bank, by browsing or by searching banks, topics and questions. A topic or question
 * found by search opens its bank with that topic (or question) already chosen.
 */
export default function BankPicker({ mode = 'topics', onChange, lockBankId = null }) {
  const [bankId, setBankId] = useState(lockBankId);
  const [focus, setFocus] = useState(null);

  const open = useCallback((id, found = null) => {
    setFocus(found);
    setBankId(id);
  }, []);

  const report = useRef(onChange);
  report.current = onChange;
  useEffect(() => {
    if (!bankId) report.current(null);
  }, [bankId]);

  if (!bankId) return <BanksStep mode={mode} onOpen={open} />;
  return <BankStep key={bankId} mode={mode} bankId={bankId} focus={focus} canGoBack={!lockBankId} onBack={() => open(null)} onChange={onChange} />;
}
