/**
 * ui: the shared building blocks of the redesigned screens (Courses, Opportunities and the admin
 * management screens). Plain CSS on the design tokens (ui.css), Phosphor icons, no Material UI.
 *
 *   Buttons       Button, IconButton
 *   Display       Badge, Chip, Avatar, OrgLogo (a company or issuer logo with an initials fallback), Tip
 *   Forms         TextField, SelectField, Checkbox, Switch, SearchField
 *   Overlays      Dialog, ConfirmDialog, Drawer, DetailPanel (the sliding detail view of a list item)
 *   Feedback      EmptyState, Notice, Skeleton, SkeletonRows
 *   Layout        Page (narrow), PageHeader, Card, Pagination, BulkBar, Toolbar
 *   Menus         Menu (a popover list of actions)
 *   Structure     Disclosure (accordion item), Stepper (pills for a multi-step flow)
 *   Stats         StatTile, StatGrid (.ui-stats)
 *   Forms layout  FormSection, StickyFooter, DangerZone
 *   Tables        SortHeader (a sortable th)
 *   Tabs          PillTabs, from ../custom-components
 *   Helpers       formatNumber, formatDate, formatDateTime, relativeTime, daysUntil, pluralize
 *
 * Tables, grids and lists are plain markup with the classes in ui.css (.ui-table, .ui-toolbar,
 * .ui-grid, .ui-list). Import from the folder:  import { Button, Page } from '../ui';
 */
import './ui.css';

export { default as Button, IconButton } from './Button';
export { Badge, Chip, Avatar } from './Display';
export { OrgLogo, cleanDomain, logoDomainOf } from './OrgLogo';
export { TextField, SelectField, Checkbox, Switch, SearchField } from './Field';
export { Dialog, ConfirmDialog, Drawer } from './Overlays';
export { default as DetailPanel } from './DetailPanel';
export { EmptyState, Notice, Skeleton, SkeletonRows } from './Feedback';
export { Page, PageHeader, Card, Pagination, BulkBar, Toolbar } from './Layout';
export { Menu } from './Menu';
export { Disclosure } from './Disclosure';
export { Stepper } from './Stepper';
export { StatTile, StatGrid } from './Stats';
export { FormSection, StickyFooter, DangerZone } from './Form';
export { SortHeader } from './Table';
export { default as Tip } from './Tip';
export { PillTabs } from '../custom-components';
export { formatNumber, formatDate, formatDateTime, relativeTime, daysUntil, pluralize, initialsOf } from './format';
