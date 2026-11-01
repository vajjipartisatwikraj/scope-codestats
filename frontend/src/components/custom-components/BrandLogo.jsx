import React from 'react';
import brand from '../../brand';
import { useTheme } from '../../contexts/ThemeContext';
import './BrandLogo.css';

/**
 * The platform's icon and name as two pictures of the same height, one set per theme
 * (brand.platform.navbar). When the platform has no such pictures, `fallback` is shown instead.
 *
 * Props
 *   height    the height of both pictures in px (default 32)
 *   part      'both' (default) | 'left' (the icon only) | 'right' (the name only)
 *   theme     'dark' | 'light'. Default: the current theme. Pass 'dark' for a surface that is always dark.
 *   fallback  what to show when the platform has no navbar pictures (default nothing)
 *   keepName  true keeps the name picture on a narrow phone too (default: it is hidden under 480px)
 *   className extra class
 *
 * The pictures are decorative: put an aria-label on the link or button that wraps this.
 * It reads the theme (and the brand) itself, the one exception to the props-only rule of this folder.
 */
export function hasBrandLogo() {
  return Boolean(brand.platform.navbar);
}

export default function BrandLogo({ height = 32, part = 'both', theme, fallback = null, keepName = false, className }) {
  const { themeName } = useTheme();
  const navbar = brand.platform.navbar;
  if (!navbar) return fallback;

  const key = theme || (themeName === 'daylight' ? 'light' : 'dark');
  const style = { height };

  return (
    <span className={`ds-brand-logo${part === 'both' && !keepName ? ' ds-brand-logo--both' : ''}${className ? ` ${className}` : ''}`}>
      {part !== 'right' ? <img className="ds-brand-logo__img" src={navbar.left[key]} alt="" style={style} /> : null}
      {part !== 'left' ? (
        <img className="ds-brand-logo__img ds-brand-logo__name" src={navbar.right[key]} alt="" style={style} />
      ) : null}
    </span>
  );
}
