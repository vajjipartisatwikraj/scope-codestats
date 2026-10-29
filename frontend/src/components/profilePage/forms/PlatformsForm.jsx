import React from 'react';
import { Button, Notice, TextField } from '../../ui';
import { PLATFORMS, usernameFrom } from '../profileModel';

/**
 * The usernames of the five platforms. A pasted profile link is accepted; only the username is kept.
 *
 *   draft         { leetcode: '...', ... }
 *   set, errors   from SectionEditor (or the setup)
 *   saved         the usernames already linked, { leetcode: 'name' }: a platform in it can be unlinked
 *   onUnlink(platform)   asks to unlink (the screen confirms); leave out where unlinking makes no sense
 *   required      every platform must have a username (the first-time setup)
 */
export default function PlatformsForm({ draft, set, errors, saved = {}, onUnlink, required = false }) {
  return (
    <div className="pf-platforms-form">
      <Notice tone="info">
        We read your public stats from each platform. They appear on your profile after the next nightly update, at 12:00 am IST.
      </Notice>

      <div className="pf-fields">
        {PLATFORMS.map((platform) => {
          const linked = Boolean(saved[platform.key]);
          return (
            <div key={platform.key} className="pf-platform-field">
              <TextField
                label={
                  <span className="pf-platform-label">
                    <span className="pf-dot" style={{ backgroundColor: platform.color }} aria-hidden="true" />
                    {platform.name}
                  </span>
                }
                required={required}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={draft[platform.key]}
                onChange={(event) => set({ [platform.key]: event.target.value })}
                onBlur={() => {
                  const clean = usernameFrom(draft[platform.key]);
                  if (clean !== draft[platform.key]) set({ [platform.key]: clean });
                }}
                error={errors[platform.key]}
                placeholder="Username"
                hint={`Your ${platform.name} username, ${platform.example}. You can paste your profile link too.`}
              />
              {linked && onUnlink ? (
                <Button size="sm" variant="ghost" onClick={() => onUnlink(platform)}>
                  Unlink {platform.name}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
