import React from 'react';
import { Link } from 'react-router-dom';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import Avatar from './Avatar';
import { describeAccount, toTitleCase } from './formatters';

/**
 * The account pill: photo, name, and "CSE · III Year" (or the role for staff). It opens the
 * profile. On narrow screens only the photo is shown.
 */
const AccountLink = ({ user }) => {
  const { config: academicYearConfig } = useAcademicYear();

  const name = toTitleCase(user?.name);
  const detail = describeAccount(user, academicYearConfig);

  return (
    <Link
      to="/profile?setup=true"
      className="ds-navbar__account"
      aria-label={`${name}${detail ? `, ${detail}` : ''}. Open profile`}
    >
      <Avatar name={name} src={user?.profilePicture} />
      <span className="ds-navbar__account-text">
        <span className="ds-navbar__account-name">{name}</span>
        {detail ? <span className="ds-navbar__account-detail">{detail}</span> : null}
      </span>
    </Link>
  );
};

export default AccountLink;
