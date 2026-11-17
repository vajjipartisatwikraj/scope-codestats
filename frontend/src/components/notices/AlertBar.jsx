import React from 'react';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import './alertBar.css';

/**
 * AlertBar: the alert as it is drawn, a band across the full width in the platform blue with white
 * text, an optional white button and a cross. It only draws; AlertBand adds the loading, the closing
 * and the page offset, and the management screen shows it as a preview.
 *
 *   message        the text (one or two lines)
 *   buttonText     the button's label; the button is left out without one
 *   onButton()     the button was pressed
 *   onClose()      the cross was pressed
 *   closing        fade out (the band is about to be removed)
 *   preview        drawn inside a form: in the flow, not stuck to the top of the window
 *   ref            reaches the band itself, which must be a direct child of the page's column so that
 *                  sticking to the top works (AlertBand measures it)
 */
const AlertBar = React.forwardRef(function AlertBar({ message, buttonText, onButton, onClose, closing = false, preview = false }, ref) {
  return (
    <div ref={ref} className="nb" role="region" aria-label="Alert" data-closing={closing ? 'true' : 'false'} data-preview={preview ? 'true' : 'false'}>
      <div className="nb__inner">
        <span className="nb__spacer" aria-hidden="true" />
        <div className="nb__content">
          <p className="nb__message">{message}</p>
          {buttonText ? (
            <button type="button" className="nb__button" onClick={onButton}>
              {buttonText}
            </button>
          ) : null}
        </div>
        <button type="button" className="nb__close" aria-label="Close this alert" onClick={onClose}>
          <XIcon size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});

export default AlertBar;
