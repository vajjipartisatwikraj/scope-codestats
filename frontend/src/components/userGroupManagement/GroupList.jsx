import React from 'react';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { Button, EmptyState, Notice, SearchField, SkeletonRows, pluralize } from '../ui';

/**
 * The left pane: a search field and the groups, newest first. The selected group is marked with a
 * tint and a caret (aria-current) so the pane works without colour.
 *
 *   groups, visible    all groups, and the ones that match the search
 *   loading, error     the list is loading; the message of a failed load
 *   search, onSearch   the search text
 *   selectedId, onSelect(id)
 *   onRetry, onCreate
 */
export default function GroupList({ groups, visible, loading, error, search, onSearch, selectedId, onSelect, onRetry, onCreate }) {
  if (loading) return <SkeletonRows count={6} height={64} />;

  if (error) {
    return (
      <div className="ug-pad">
        <Notice
          tone="danger"
          title="We could not load the user groups"
          action={
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        compact
        title="No user groups yet"
        text="Upload a list of roll numbers once, then attach it to any cohort or communication test."
        action={<Button onClick={onCreate}>Create user group</Button>}
      />
    );
  }

  return (
    <>
      <div className="ug-search">
        <SearchField value={search} onChange={onSearch} placeholder="Search user groups" label="Search user groups" />
      </div>
      {visible.length === 0 ? (
        <EmptyState
          compact
          icon={<MagnifyingGlassIcon size={28} weight="regular" />}
          title="No groups match your search"
          text={`Nothing is called or described as "${search.trim()}".`}
          action={<Button onClick={() => onSearch('')}>Clear search</Button>}
        />
      ) : (
        <ul className="ug-groups" aria-label="User groups">
          {visible.map((group) => {
            const selected = group._id === selectedId;
            return (
              <li key={group._id}>
                <button type="button" className="ug-group" data-id={group._id} aria-current={selected ? 'true' : undefined} onClick={() => onSelect(group._id)}>
                  <span className="ug-group__text">
                    <span className="ug-group__name">{group.name}</span>
                    <span className="ug-group__meta">
                      {pluralize(group.memberCount, 'roll number')} · {pluralize(group.cohortCount, 'cohort')} · {pluralize(group.testCount, 'test')}
                    </span>
                  </span>
                  <CaretRightIcon className="ug-group__caret" size={16} weight="bold" aria-hidden="true" data-on={selected ? 'true' : 'false'} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
