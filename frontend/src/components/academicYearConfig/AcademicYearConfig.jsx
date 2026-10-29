import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/apiConfig';
import useMediaQuery from '../../hooks/useMediaQuery';
import { Button, Card, EmptyState, Notice, Page, PageHeader, SelectField, Skeleton, pluralize } from '../ui';
import './academicYearConfig.css';
import { MONTH_NAMES, describeChanges, hasChanges, sortMappings } from './academicYearModel';
import MappingDialog from './MappingDialog';
import MappingTable from './MappingTable';

/**
 * Academic year configuration (route /admin/academic-year-config, admins and teachers).
 *
 * How graduating years map to First year, Second year and so on. The platform uses it for the
 * leaderboard, filters and user displays. Same calls as before: GET and PUT
 * /admin/academic-year-config with the bearer token, and refresh() of AcademicYearContext after a
 * save so the navbar and the leaderboard pick up the change at once.
 *
 * design/screens.md section 16: one card with the current year, the mapping table and a primary
 * Save that stays disabled until something changes. Edits are kept on the page; a note lists what
 * the change does to students. Nothing is sent until Save.
 */

const MAX_LINES = 6;

export default function AcademicYearConfig() {
  const { token } = useAuth();
  const { refresh: refreshSharedConfig } = useAcademicYear();
  const navigate = useNavigate();
  const compact = useMediaQuery('(max-width: 899.95px)');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [saved, setSaved] = useState({ mappings: [], startMonth: 3 });
  const [mappings, setMappings] = useState([]);
  const [startMonth, setStartMonth] = useState(3);
  const [editing, setEditing] = useState(null); // { mapping, original } while the dialog is open

  const fetchConfig = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      setLoadError('');
      try {
        const response = await axios.get(`${apiUrl}/admin/academic-year-config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          const cfg = response.data.config;
          const month = cfg.academicYearStartMonth ?? 3;
          const list = cfg.yearMappings || [];
          setConfig(cfg);
          setMappings(list);
          setStartMonth(month);
          setSaved({ mappings: list, startMonth: month });
        }
      } catch (error) {
        console.error('Error fetching academic year config:', error);
        setLoadError('Check your connection and try again.');
        toast.error('Failed to load academic year configuration');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const current = useMemo(() => ({ mappings, startMonth }), [mappings, startMonth]);
  const dirty = useMemo(() => hasChanges(saved, current), [saved, current]);
  const changes = useMemo(() => (dirty ? describeChanges(saved, current) : []), [dirty, saved, current]);
  const sorted = useMemo(() => sortMappings(mappings), [mappings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.put(
        `${apiUrl}/admin/academic-year-config`,
        { academicYearStartMonth: startMonth, yearMappings: sorted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success('Academic year settings saved');
        refreshSharedConfig(); // navbar, leaderboard etc. pick up the change now
        fetchConfig({ quiet: true });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    const year = new Date().getFullYear();
    setEditing({ mapping: { graduationYear: year + 1, academicYear: 'First Year', displayName: 'I Year' }, original: null });
  };

  const openEdit = (mapping) => setEditing({ mapping: { ...mapping }, original: mapping.graduationYear });

  const submitMapping = (next) => {
    const original = editing.original;
    // Editing a row replaces it (even when its year changes); a year that is already mapped is replaced too
    setMappings((list) => [...list.filter((item) => item.graduationYear !== next.graduationYear && item.graduationYear !== original), next]);
    setEditing(null);
  };

  const removeMapping = (mapping) => setMappings((list) => list.filter((item) => item.graduationYear !== mapping.graduationYear));

  const startName = MONTH_NAMES[saved.startMonth] || 'April';
  const monthOptions = MONTH_NAMES.map((name, index) => ({ value: index, label: index === 3 ? `${name} (recommended)` : name }));
  const shown = changes.slice(0, MAX_LINES);

  const header = (
    <PageHeader
      title="Academic years"
      count={config ? pluralize(mappings.length, 'mapping') : undefined}
      description="Decide which year of study each graduating year is in. Leaderboards, filters and profiles use these names."
      actions={
        <Button variant="ghost" startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => navigate('/admin/dashboard')}>
          Admin dashboard
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <Page className="ay">
        {header}
        <Card className="ay-card" aria-busy="true" aria-label="Loading the academic year settings">
          <div className="ay-top">
            <Skeleton height={120} radius="var(--ds-radius-lg)" />
            <Skeleton height={120} radius="var(--ds-radius-lg)" />
          </div>
          <div className="ay-skeleton-rows">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} height={compact ? 72 : 44} radius="var(--ds-radius-md)" />
            ))}
          </div>
        </Card>
      </Page>
    );
  }

  if (!config) {
    return (
      <Page className="ay">
        {header}
        <Notice
          tone="danger"
          title="We could not load the academic year settings"
          action={
            <Button variant="ghost" size="sm" onClick={() => fetchConfig()}>
              Retry
            </Button>
          }
        >
          {loadError || 'Try again in a moment.'}
        </Notice>
      </Page>
    );
  }

  return (
    <Page className="ay">
      {header}

      <Card className="ay-card" aria-labelledby="ay-title">
        <h2 id="ay-title" className="ui-sr">
          Academic year settings
        </h2>

        <div className="ay-top">
          <div className="ay-current">
            <p className="ay-current__label">Current academic year</p>
            <p className="ay-current__value">{config.currentAcademicYear || 'Not set'}</p>
            <p className="ay-current__context">Starts in {startName}</p>
          </div>
          <div className="ay-start">
            <SelectField
              label="Academic year start month"
              hint="Students move up a year when this month begins."
              value={startMonth}
              onChange={(event) => setStartMonth(Number(event.target.value))}
              options={monthOptions}
              disabled={saving}
            />
          </div>
        </div>

        <hr className="ay-rule" />

        <div className="ay-section-head">
          <div>
            <h3 className="ay-section-title">Graduating year mappings</h3>
            <p className="ay-section-text">Newest graduating year first. Changes apply when you save.</p>
          </div>
          <Button startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={openAdd} disabled={saving}>
            Add mapping
          </Button>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarBlankIcon size={28} weight="regular" />}
            title="No year mappings yet"
            text="Add one mapping for each graduating year, so students show as First year, Second year and so on."
            action={<Button onClick={openAdd}>Add mapping</Button>}
          />
        ) : (
          <MappingTable mappings={sorted} saved={saved} compact={compact} onEdit={openEdit} onRemove={removeMapping} />
        )}

        {changes.length > 0 ? (
          <section className="ay-changes" aria-labelledby="ay-changes-title">
            <InfoIcon size={20} weight="fill" aria-hidden="true" className="ay-changes__icon" />
            <div>
              <h3 id="ay-changes-title" className="ay-changes__title">
                What saving changes for students
              </h3>
              <ul className="ay-changes__list">
                {shown.map((line) => (
                  <li key={line.id}>{line.text}</li>
                ))}
                {changes.length > shown.length ? <li>{pluralize(changes.length - shown.length, 'more change')}.</li> : null}
              </ul>
            </div>
          </section>
        ) : null}

        <div className="ay-footer">
          <p className="ay-footer__status" role="status" aria-live="polite">
            {dirty ? `${pluralize(changes.length, 'change')} not saved` : 'No unsaved changes'}
          </p>
          <div className="ay-footer__actions">
            <Button onClick={() => fetchConfig({ quiet: true })} disabled={!dirty || saving}>
              Discard changes
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!dirty} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </Card>

      {editing ? (
        <MappingDialog
          mapping={editing.mapping}
          original={editing.original}
          existing={mappings.map((item) => item.graduationYear)}
          onSubmit={submitMapping}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Page>
  );
}
