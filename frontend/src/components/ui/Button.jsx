import React, { forwardRef } from 'react';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import Tip from './Tip';

/**
 * Button (DESIGN.md, Buttons): a pill, 44px (36px compact).
 *
 *   variant     'primary' (accent fill, one per view) | 'secondary' (raised fill, the default) |
 *               'spotlight' (the strong neutral) | 'ghost' (no fill, accent text) |
 *               'danger' (danger fill, always behind a confirmation)
 *   size        'md' (44px) | 'sm' (36px)
 *   loading     the spinner replaces the icon, the width and the label stay, and it cannot be pressed
 *   startIcon, endIcon   nodes (Phosphor icons at 18px)
 *   fullWidth   fill the width of the parent
 *   as          'button' (default) | 'a' (a link that looks like a button; pass href)
 *
 * Disabled is the high fill with a subtle label, never a lowered opacity.
 *
 * The danger variant's label is the surface colour: 6.5:1 on Midnight and 5.6:1 on Daylight
 * (checked against --ds-danger in theme/tokens.js), and its hover mix only moves away from the
 * label, so 4.5:1 holds in both themes and every state.
 */
const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, startIcon, endIcon, fullWidth = false, as = 'button', className, children, disabled, ...rest },
  ref
) {
  const Component = as;
  const isButton = Component === 'button';
  const props = isButton
    ? { type: rest.type || 'button', disabled: disabled || loading }
    : { 'aria-disabled': disabled || loading || undefined, tabIndex: disabled || loading ? -1 : rest.tabIndex };

  return (
    <Component
      ref={ref}
      {...rest}
      {...props}
      className={className ? `ui-button ${className}` : 'ui-button'}
      data-variant={variant}
      data-size={size}
      data-full={fullWidth ? 'true' : 'false'}
      aria-busy={loading || undefined}
    >
      {loading ? <SpinnerGapIcon size={18} weight="bold" aria-hidden="true" data-spin="true" /> : startIcon}
      <span className="ui-button__label">{children}</span>
      {endIcon}
    </Component>
  );
});

export default Button;

/**
 * IconButton: a 44px circle (36px compact) with an icon. It always has an accessible name and a
 * tooltip, so `label` is required.
 *
 *   label    the name, also the tooltip
 *   size     'md' | 'sm'
 *   tone     'neutral' (raised fill, the default) | 'danger' (danger text) | 'plain' (no fill)
 *   active   a pressed or selected state (aria-pressed)
 *   href     renders a link (`<a>`) with the same classes and the same colours in every state (the
 *            global a:hover rule in index.css is overridden). Pass target and rel as usual. A
 *            disabled link gets aria-disabled and leaves the tab order.
 *   tooltip  `false` skips the tooltip (the aria-label stays), for a button that sits next to its
 *            own visible text or inside a menu
 *   disabled a 'neutral' or 'danger' button is the high fill with a subtle label; a 'plain' one
 *            stays without a fill and only turns subtle, so a row of plain icons does not grow
 *            heavy discs
 *   children the icon (20px)
 */
export const IconButton = forwardRef(function IconButton(
  { label, size = 'md', tone = 'neutral', active, href, tooltip = true, disabled, className, children, ...rest },
  ref
) {
  const common = {
    ref,
    ...rest,
    className: className ? `ui-icon-button ${className}` : 'ui-icon-button',
    'data-size': size,
    'data-tone': tone,
    'aria-label': label,
    'aria-pressed': active === undefined ? undefined : active,
  };
  const control =
    href !== undefined ? (
      <a
        {...common}
        href={disabled ? undefined : href}
        role={disabled ? 'link' : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : rest.tabIndex}
      >
        {children}
      </a>
    ) : (
      <button type="button" {...common} disabled={disabled}>
        {children}
      </button>
    );
  return tooltip === false ? control : <Tip text={label}>{control}</Tip>;
});
