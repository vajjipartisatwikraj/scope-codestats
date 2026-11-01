import React from 'react';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/csr/LockSimple';
import { BookOpenTextIcon } from '@phosphor-icons/react/dist/csr/BookOpenText';
import { EmptyState, Prose, SkeletonRows } from '../../../../ui';
import SectionFrame from '../shared/SectionFrame';
import './sections.css';

/**
 * The Editorial section: the teacher's walk-through of the solution. It is locked until the student
 * has solved the question, and the server decides (a refusal arrives as `denied`).
 *
 *   data       { editorial, loading, denied } from useEditorial
 *   embedded   inside the statement pane (a phone)
 */
export default function EditorialSection({ data, embedded }) {
  const { editorial, loading, denied } = data;
  let body;
  if (loading) body = <SkeletonRows count={4} height={48} />;
  else if (denied) body = <EmptyState icon={<LockSimpleIcon size={28} weight="regular" />} title="Editorial locked" text="Solve the question correctly to unlock the editorial." />;
  else if (editorial && editorial.trim()) body = <Prose html={editorial} className="ps-statement" />;
  else body = <EmptyState icon={<BookOpenTextIcon size={28} weight="regular" />} title="No editorial yet" text="Your teacher has not written one for this question." />;

  return (
    <SectionFrame label="Editorial" lead={<h2 className="ps-pane__title">Editorial</h2>} embedded={embedded}>
      {body}
    </SectionFrame>
  );
}
