import React from 'react';
import { useParams } from 'react-router-dom';
import { BooksIcon } from '@phosphor-icons/react/dist/csr/Books';
import { EmptyState, Notice, Page, SkeletonRows } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import * as api from './api/bankLibraryApi';
import useLibraryRequest from './hooks/useLibraryRequest';
import { apiMessage } from './model/bankLibrary';
import BankView from './page/BankView';
import BanksView from './page/BanksView';
import TopicView from './page/TopicView';
import './bankLibrary.css';

/**
 * The bank library (routes /admin/bank-library, /admin/bank-library/:bankId and
 * /admin/bank-library/:bankId/:topicId; administrators only): banks of questions kept in an S3
 * bucket, organised as bank > topic > question. Teachers do not come here; they import from the
 * library inside a cohort (components/bankLibrary/picker).
 *
 * Folder: page/ (the three levels), forms/ (the drawers and the question sheet), picker/ (finding and
 * importing, used by the cohort screens too), hooks/, api/ (every request) and model/ (rules, no React).
 *
 * Until the bucket is configured the page says so instead of failing on every request.
 */
export default function BankLibraryPage() {
  const { bankId, topicId } = useParams();
  const { token } = useAuth();
  const status = useLibraryRequest(() => api.getStatus(token), [token]);

  let content;
  if (status.loading && !status.data) {
    content = <SkeletonRows count={4} height={76} />;
  } else if (status.error) {
    content = (
      <Notice tone="danger" title="The bank library did not load">
        {apiMessage(status.error, 'Check your connection and try again.')}
      </Notice>
    );
  } else if (!status.data?.configured) {
    content = (
      <EmptyState
        icon={<BooksIcon size={28} weight="regular" />}
        title="The bank library is not set up yet"
        text="Create the S3 bucket and set BANK_LIBRARY_S3_BUCKET (and its region) in the backend environment, then restart the server."
      />
    );
  } else {
    content = (
      <>
        {status.data.reachable === false ? (
          <Notice tone="warning" title="The bucket cannot be reached" className="bl-status">
            {status.data.reason || 'Check the bucket name, its region and the permissions of the server.'}
          </Notice>
        ) : null}
        {topicId ? <TopicView key={`${bankId}/${topicId}`} bankId={bankId} topicId={topicId} /> : bankId ? <BankView key={bankId} bankId={bankId} /> : <BanksView />}
      </>
    );
  }

  return <Page className="bl">{content}</Page>;
}
