/** What a student can report about a question, and how a report's status reads. */

export const REPORT_TYPES = [
  { value: 'test_case_issue', label: 'Test case issue' },
  { value: 'incorrect_question', label: 'Incorrect question' },
  { value: 'constraints_issue', label: 'Constraints issue' },
  { value: 'technical_issue', label: 'Technical issue' },
  { value: 'other', label: 'Other issue' },
];

export const REPORT_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'warning' },
  { value: 'in_progress', label: 'In progress', tone: 'info' },
  { value: 'resolved', label: 'Resolved', tone: 'success' },
  { value: 'rejected', label: 'Rejected', tone: 'danger' },
];

export const reportTypeLabel = (value) => REPORT_TYPES.find((entry) => entry.value === value)?.label || 'Issue report';
export const reportStatusOf = (value) => REPORT_STATUSES.find((entry) => entry.value === value) || REPORT_STATUSES[0];
