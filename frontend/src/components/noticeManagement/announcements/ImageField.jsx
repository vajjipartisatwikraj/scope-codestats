import React, { useEffect, useState } from 'react';
import { ImageSquareIcon } from '@phosphor-icons/react/dist/csr/ImageSquare';
import { TextField } from '../../ui';
import { isImageUrlValid } from './announcementFormat';

/**
 * The picture of an announcement: its web address, and a preview of what that address shows, so a
 * wrong link is seen before the announcement is saved. The picture sits on the left of the card, so
 * a wide or square picture is best; it is cropped to fit.
 *
 *   value, error, onChange(url)
 *   disabled
 *   id
 */
export default function ImageField({ value, error, onChange, disabled, id }) {
  const address = value.trim();
  const usable = address !== '' && isImageUrlValid(address);
  const [broken, setBroken] = useState(false);

  // A new address gets a fresh chance to load
  useEffect(() => setBroken(false), [address]);

  return (
    <>
      <TextField
        id={id}
        label="Image address (optional)"
        placeholder="https://example.com/banner.jpg"
        hint="The picture shown on the left of the announcement."
        maxLength={1000}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        disabled={disabled}
      />
      <div className="nm-image" aria-live="polite">
        {usable && !broken ? (
          <img src={address} alt="Preview of the picture" onError={() => setBroken(true)} />
        ) : (
          <span className="nm-image__empty">
            <ImageSquareIcon size={28} weight="regular" aria-hidden="true" />
            {usable && broken ? 'The picture could not be loaded from this address.' : 'The picture appears here.'}
          </span>
        )}
      </div>
    </>
  );
}
