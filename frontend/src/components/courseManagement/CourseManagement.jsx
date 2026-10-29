import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { FunnelSimpleIcon } from '@phosphor-icons/react/dist/csr/FunnelSimple';
import useMediaQuery from '../../hooks/useMediaQuery';
import { Button, Card, ConfirmDialog, EmptyState, Notice, Page, PageHeader, Pagination, SearchField, SelectField, SkeletonRows, pluralize } from '../ui';
import CourseDrawer from './CourseDrawer';
import CourseTable from './CourseTable';
import { CATEGORIES, LEVELS, levelLabel, matches, sortCourses } from './courseModel';
import useCourses from './useCourses';
import './courseManagement.css';

/**
 * Course management (routes /course-management and /admin/courses, admins only).
 *
 * A table page (design/screens.md section 16): the header with the count and the primary action,
 * a filter row, the table (rows on a phone) and pagination. A row opens a drawer to edit the
 * course; deleting asks first and names the course.
 */
export default function CourseManagement() {
  const mobile = useMediaQuery('(max-width: 899.95px)');
  const { courses, loading, failed, reload, save, remove } = useCourses();

  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // The drawer: { nonce, course } while open (a new nonce gives it a fresh form)
  const [drawer, setDrawer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtering = Boolean(search.trim() || level || category);

  const visible = useMemo(
    () => sortCourses(courses.filter((course) => matches(course, { search, level, category })), sort),
    [courses, search, level, category, sort]
  );

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages);
  const rows = visible.slice((current - 1) * pageSize, current * pageSize);

  // Deleting the last course of the last page leaves the page that is now empty
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const filterBy = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setLevel('');
    setCategory('');
    setPage(1);
  };

  const onSort = (key) => {
    setSort((previous) => (previous.key === key ? { key, dir: previous.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const openDrawer = (course = null) => setDrawer({ nonce: Date.now(), course });

  const onSave = async (form) => {
    setSaving(true);
    const saved = await save(form, drawer.course ? drawer.course._id : undefined);
    setSaving(false);
    if (saved) setDrawer(null);
  };

  const onConfirmDelete = async () => {
    setDeleting(true);
    const removed = await remove(toDelete._id);
    setDeleting(false);
    if (removed) {
      setToDelete(null);
      setDrawer(null);
    }
  };

  const activeFilters = [level ? `level ${levelLabel(level)}` : null, category ? `category ${(CATEGORIES.find((entry) => entry.value === category) || {}).label}` : null, search.trim() ? `\u201c${search.trim()}\u201d` : null].filter(Boolean);

  const addButton = (
    <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => openDrawer()}>
      Add course
    </Button>
  );

  let body;
  if (loading) {
    body = (
      <Card flush className="cm-card" aria-busy="true" aria-label="Courses">
        <SkeletonRows count={7} height={mobile ? 64 : 48} />
      </Card>
    );
  } else if (failed && courses.length === 0) {
    body = (
      <Card className="cm-card">
        <Notice
          tone="danger"
          title="We could not load the courses"
          action={
            <Button variant="ghost" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          Check your connection and try again. Nothing was changed.
        </Notice>
      </Card>
    );
  } else {
    body = (
      <Card flush className="cm-card" aria-label="Courses">
        {failed ? (
          <div className="cm-notice">
            <Notice
              tone="danger"
              title="We could not refresh the list"
              action={
                <Button variant="ghost" size="sm" onClick={reload}>
                  Retry
                </Button>
              }
            >
              You are looking at the last list that loaded.
            </Notice>
          </div>
        ) : null}

        {courses.length > 0 ? (
          <div className="ui-toolbar cm-toolbar">
            <SearchField className="ui-toolbar__grow" value={search} onChange={(text) => { setSearch(text); setPage(1); }} placeholder="Search by title or description" label="Search courses" />
            <SelectField
              variant="pill"
              aria-label="Filter by level"
              value={level}
              onChange={filterBy(setLevel)}
              options={[{ value: '', label: 'Any level' }, ...LEVELS.map((entry) => ({ value: entry, label: levelLabel(entry) }))]}
            />
            <SelectField
              variant="pill"
              aria-label="Filter by category"
              value={category}
              onChange={filterBy(setCategory)}
              options={[{ value: '', label: 'Any category' }, ...CATEGORIES]}
            />
            {filtering ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}

        {courses.length === 0 ? (
          <EmptyState
            icon={<GraduationCapIcon size={28} weight="regular" />}
            title="No courses yet"
            text="Add the first course and students will see it on their Courses page."
            action={addButton}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<FunnelSimpleIcon size={28} weight="regular" />}
            title="No courses match"
            text={`Nothing matches ${activeFilters.join(', ')}. Try a broader search.`}
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <CourseTable courses={rows} mobile={mobile} sort={sort} onSort={onSort} onOpen={openDrawer} onDelete={setToDelete} />
            <Pagination
              page={current}
              pageSize={pageSize}
              total={visible.length}
              onPage={setPage}
              onPageSize={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              sizes={[10, 25, 50]}
            />
          </>
        )}
      </Card>
    );
  }

  return (
    <Page className="cm-page">
      <PageHeader
        title="Course management"
        count={!loading && !(failed && courses.length === 0) && courses.length > 0 ? pluralize(courses.length, 'course') : undefined}
        description="Add, edit and remove the courses students see on their Courses page."
        actions={courses.length > 0 || loading ? addButton : undefined}
      />

      <p className="ui-sr" aria-live="polite">
        {!loading && courses.length > 0 ? `${pluralize(visible.length, 'course')} shown` : ''}
      </p>

      {body}

      {drawer ? <CourseDrawer key={drawer.nonce} course={drawer.course} saving={saving} locked={Boolean(toDelete)} onClose={() => setDrawer(null)} onSave={onSave} onDelete={setToDelete} /> : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this course?"
        description={toDelete ? `\u201c${toDelete.title}\u201d will disappear from the Courses page for every student. This cannot be undone.` : ''}
        confirmLabel="Delete course"
        danger
        busy={deleting}
        onConfirm={onConfirmDelete}
      />
    </Page>
  );
}
