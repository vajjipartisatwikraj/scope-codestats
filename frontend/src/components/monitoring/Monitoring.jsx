import React, { useState } from 'react';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { DatabaseIcon } from '@phosphor-icons/react/dist/csr/Database';
import { LockIcon } from '@phosphor-icons/react/dist/csr/Lock';
import { MicrophoneIcon } from '@phosphor-icons/react/dist/csr/Microphone';
import { PulseIcon } from '@phosphor-icons/react/dist/csr/Pulse';
import { useAuth } from '../../contexts/AuthContext';
import { AdminTop, Card, EmptyState, Page, PageHeader, PillTabs } from '../ui';
import ApiTraffic from './ApiTraffic';
import DatabaseSize from './DatabaseSize';
import Judge0Api from './Judge0Api';
import VocalqApi from './VocalqApi';
import './monitoring.css';

const TABS = [
  { key: 'api', label: 'API traffic', icon: <PulseIcon size={18} aria-hidden="true" /> },
  { key: 'database', label: 'Database', icon: <DatabaseIcon size={18} aria-hidden="true" /> },
  { key: 'vocalq', label: 'VocalQ API', icon: <MicrophoneIcon size={18} aria-hidden="true" /> },
  { key: 'judge0', label: 'Judge0 API', icon: <CodeIcon size={18} aria-hidden="true" /> },
];

/**
 * Monitoring (route /admin/monitoring, admins only): how the platform is being used and how much
 * space it takes.
 *
 *   API traffic   requests, how they ended (status codes), response times and response types, per
 *                 route and over time, plus the errors and slow requests with the user who hit them
 *   Database      every collection with its records and size, the size over time, the disk and
 *                 an estimate of when it fills
 *   VocalQ API    how the speech judge is used: evaluations and scores, its API calls, audio and AI
 *                 tokens, and its own storage. SpeechJudge's usage reports, read by the backend
 *   Judge0 API    the code execution engine: submissions, results and languages, queues and workers,
 *                 its limits and its server. Judge0's own statistics, read by the backend
 *
 * design/screens.md section 15 (admin analytics, compact). The numbers are counted on the server
 * (backend/services/monitoring) and nothing here talks to the database directly.
 */
export default function Monitoring() {
  const { user } = useAuth();
  const [tab, setTab] = useState('api');

  // Only administrators watch the platform
  if (user && user.userType !== 'admin') {
    return (
      <Page>
        <PageHeader title="Monitoring" />
        <Card>
          <EmptyState
            icon={<LockIcon size={28} weight="regular" />}
            title="Access denied"
            text="Only administrators can open Monitoring. Ask an administrator if you need access."
          />
        </Card>
      </Page>
    );
  }

  return (
    <Page className="mon-page">
      {/* No search on this screen: the admin top has the heading and the sections at the right end */}
      <AdminTop
        title="Monitoring"
        description="How the platform is used and how much space it takes."
        label="Monitoring sections"
        filters={<PillTabs items={TABS} value={tab} onChange={setTab} label="Monitoring sections" idPrefix="mon" />}
      />
      <div role="tabpanel" id={`mon-panel-${tab}`} aria-labelledby={`mon-tab-${tab}`}>
        {tab === 'api' ? <ApiTraffic /> : tab === 'database' ? <DatabaseSize /> : tab === 'vocalq' ? <VocalqApi /> : <Judge0Api />}
      </div>
    </Page>
  );
}
