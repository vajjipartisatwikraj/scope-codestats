import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Button, Drawer } from '../../ui';
import { useAuth } from '../../../contexts/AuthContext';
import * as api from '../api/bankLibraryApi';
import { apiMessage, countOf } from '../model/bankLibrary';
import BankPicker from './BankPicker';
import ImportProgress from './ImportProgress';

const FORM_DESCRIPTION = {
  cohort: 'Every topic you choose becomes a new module of this cohort, with its questions. Importing is a copy: later changes in the library do not reach the cohort.',
  module: 'Choose whole topics, single questions, or both. Questions that are already in this module are skipped.',
};

/**
 * ImportDrawer: brings content from the bank library into a cohort. Two steps in one drawer: choose
 * (the picker), then watch it run (ImportProgress). The import runs on the server, so the drawer can
 * be closed while it works; the cohort page keeps showing it (ImportBanner) and this drawer opens
 * again on it.
 *
 *   cohortId
 *   module      the module that receives the content; null to make a new module of every topic chosen
 *   imports     the result of useCohortImports(cohortId): { latest, active, adopt, cancel, retry }
 *   initialView 'pick' | 'progress'
 *   onClose()
 */
export default function ImportDrawer({ cohortId, module = null, imports, initialView = 'pick', onClose }) {
  const { token } = useAuth();
  const intoModule = Boolean(module);
  const [phase, setPhase] = useState(initialView === 'progress' || imports.active ? 'progress' : 'pick');
  const [choice, setChoice] = useState(null);
  const [starting, setStarting] = useState(false);
  const [acting, setActing] = useState(false);
  const job = imports.latest;

  const start = async () => {
    if (!choice) return;
    setStarting(true);
    try {
      const body = intoModule
        ? { cohortId, bankId: choice.bankId, topicIds: choice.topicIds, questionIds: choice.questionIds, moduleId: module._id }
        : // With every topic chosen, no list is sent and the server takes the whole bank
          { cohortId, bankId: choice.bankId, topicIds: choice.allTopics ? [] : choice.topicIds };
      const started = await api.startImport(token, body);
      imports.adopt(started);
      setPhase('progress');
    } catch (error) {
      toast.error(apiMessage(error, 'Could not start the import'), { style: { whiteSpace: 'pre-line' } });
    } finally {
      setStarting(false);
    }
  };

  const act = async (action, failure) => {
    setActing(true);
    try {
      await action();
    } catch (error) {
      toast.error(apiMessage(error, failure));
    } finally {
      setActing(false);
    }
  };

  let footer;
  let body;
  if (phase === 'pick') {
    body = <BankPicker mode={intoModule ? 'selection' : 'topics'} onChange={setChoice} />;
    footer = (
      <>
        <Button onClick={onClose} disabled={starting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={start} loading={starting} disabled={!choice}>
          {choice ? `Import ${countOf(choice.questionCount, 'question')}` : 'Import'}
        </Button>
      </>
    );
  } else if (!job) {
    body = null;
    footer = <Button onClick={onClose}>Close</Button>;
  } else {
    body = <ImportProgress job={job} />;
    footer = (
      <>
        {job.active ? (
          <Button onClick={() => act(imports.cancel, 'Could not cancel the import')} loading={acting}>
            Cancel import
          </Button>
        ) : null}
        {job.canRetry ? (
          <Button onClick={() => act(imports.retry, 'Could not retry the import')} loading={acting} variant={job.status === 'partial' ? 'secondary' : 'primary'}>
            {job.status === 'partial' ? 'Retry failed questions' : 'Retry'}
          </Button>
        ) : null}
        {!job.active ? <Button onClick={() => setPhase('pick')}>Import more</Button> : null}
        <Button variant={job.active || job.canRetry ? 'secondary' : 'primary'} onClick={onClose}>
          {job.active ? 'Hide' : 'Done'}
        </Button>
      </>
    );
  }

  return (
    <Drawer
      open
      tone="accent"
      onClose={onClose}
      busy={starting}
      width="lg"
      title={phase === 'progress' ? 'Import progress' : intoModule ? `Import into ${module.title}` : 'Import from the bank library'}
      description={phase === 'progress' ? 'It carries on in the background if you close this.' : FORM_DESCRIPTION[intoModule ? 'module' : 'cohort']}
      footer={footer}
    >
      {body}
    </Drawer>
  );
}
