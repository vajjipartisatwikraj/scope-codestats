import { pluralize } from '../../ui';
import { defaultWindow, fromInput, toInput } from '../shared/noticeFormat';

/**
 * What the announcement screen works out from an announcement: who it is for in words, the form's
 * starting values and the body sent to the server. No React and no network in this file.
 *
 *   AUDIENCES            the options of the audience dropdown
 *   audienceText(item)   "Everyone", "Students", "Teachers and admins" or "2 user groups: CSE A, IT B"
 *   startingForm(item)   the form for a new announcement (null) or an existing one
 *   bodyFrom(form)       the form as the server wants it
 *   isImageUrlValid(text)  an http or https address (a picture is never a path inside the app)
 */

export const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers and admins' },
  { value: 'groups', label: 'Specific user groups' },
];

const MAX_NAMES = 3;

export function audienceText(item) {
  if (item.audience === 'students') return 'Students';
  if (item.audience === 'teachers') return 'Teachers and admins';
  if (item.audience === 'groups') {
    const names = item.userGroups.map((group) => group.name).filter(Boolean);
    const shown = names.slice(0, MAX_NAMES).join(', ');
    const more = names.length > MAX_NAMES ? ` and ${names.length - MAX_NAMES} more` : '';
    return `${pluralize(item.userGroups.length, 'user group')}${shown ? `: ${shown}${more}` : ''}`;
  }
  return 'Everyone';
}

export function startingForm(item) {
  if (!item) {
    return {
      title: '',
      description: '',
      imageUrl: '',
      audience: 'all',
      userGroups: [],
      ...defaultWindow(),
      buttonText: '',
      buttonUrl: '',
      isActive: true,
    };
  }
  return {
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl || '',
    audience: item.audience,
    userGroups: item.userGroups.map((group) => group._id),
    startsAt: toInput(item.startsAt),
    endsAt: toInput(item.endsAt),
    buttonText: item.buttonText || '',
    buttonUrl: item.buttonUrl || '',
    isActive: item.isActive,
  };
}

export const bodyFrom = (form) => ({
  title: form.title.trim(),
  description: form.description,
  imageUrl: form.imageUrl.trim(),
  audience: form.audience,
  userGroups: form.audience === 'groups' ? form.userGroups : [],
  startsAt: fromInput(form.startsAt),
  endsAt: fromInput(form.endsAt),
  buttonText: form.buttonText.trim(),
  buttonUrl: form.buttonUrl.trim(),
  isActive: form.isActive,
});

export function isImageUrlValid(text) {
  try {
    const parsed = new URL(String(text || '').trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (failure) {
    return false;
  }
}
