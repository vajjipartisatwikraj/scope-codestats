/**
 * Small pure helpers of the notification management page: the empty form, the validation (the same
 * rules the page always had), and the conversions between the server's notifications and the form.
 */

export const EMPTY_FORM = {
  title: '',
  message: '',
  targetType: 'global',
  selectedUser: '',
  deletionTime: '',
};

/** The ids of the fields, so the first error can take focus */
export const FIELD_IDS = {
  title: 'nm-title',
  message: 'nm-message',
  selectedUser: 'nm-user',
  deletionTime: 'nm-deletion',
};

/**
 * Title and message are required; sending to one person needs a person. (Editing never changes the
 * audience, so it only checks the title and the message.) Returns { field: sentence } or {}.
 */
export function validateForm(form, editing) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Write a title for the notification.';
  if (!form.message.trim()) errors.message = 'Write the message students will read.';
  if (!editing && form.targetType === 'user' && !form.selectedUser) errors.selectedUser = 'Choose the student who should receive it.';
  return errors;
}

/** The first field with an error, in the order the fields appear on the page */
export function firstErrorField(errors) {
  return ['title', 'message', 'selectedUser', 'deletionTime'].find((field) => errors[field]) || null;
}

const pad = (number) => String(number).padStart(2, '0');

/** A date as the value of a datetime-local input, in the viewer's own time zone: 2026-10-26T14:30 */
export function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The value of a datetime-local input as an exact moment for the server, or null when empty */
export function fromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** The form that edits a notification the server sent */
export function formFromNotification(notification) {
  return {
    title: notification.title || '',
    message: notification.message || '',
    targetType: notification.type === 'global' ? 'global' : 'user',
    selectedUser: notification.user?._id || '',
    deletionTime: toLocalInput(notification.deletionTime),
  };
}

export const isGlobal = (notification) => notification.type === 'global';
