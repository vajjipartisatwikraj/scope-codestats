import React from 'react';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { CodeBlockIcon } from '@phosphor-icons/react/dist/csr/CodeBlock';
import { TagIcon } from '@phosphor-icons/react/dist/csr/Tag';
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
import { WrenchIcon } from '@phosphor-icons/react/dist/csr/Wrench';
import { Chip } from '../ui';
import { typeName } from './opportunitiesModel';

const ICONS = {
  competition: TrophyIcon,
  hackathon: CodeBlockIcon,
  internship: BriefcaseIcon,
  workshop: WrenchIcon,
  other: TagIcon,
};

/** The type of an opportunity (Competition, Hackathon, Internship, Workshop) as a chip with an icon and the word */
export default function TypeChip({ category }) {
  const Icon = ICONS[category] || TagIcon;
  return (
    <Chip className="opp-type" icon={<Icon size={16} weight="regular" aria-hidden="true" />}>
      {typeName(category)}
    </Chip>
  );
}
