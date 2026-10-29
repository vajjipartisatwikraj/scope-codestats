import React, { useEffect, useState } from 'react';
import { initialsOf } from './formatters';

/**
 * A round avatar: the photo when there is one and it loads, otherwise the person's initials.
 * Decorative: the name always appears next to it, so it is hidden from screen readers.
 */
const Avatar = ({ name, src, size = 'md' }) => {
  const [failed, setFailed] = useState(false);

  // A new photo gets a fresh chance to load.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span
      className={`ds-navbar__avatar${size === 'sm' ? ' ds-navbar__avatar--sm' : ''}`}
      aria-hidden="true"
    >
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : initialsOf(name)}
    </span>
  );
};

export default Avatar;
