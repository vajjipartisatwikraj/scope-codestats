import React from 'react';
import SpeakingFilm from '../../custom-components/SpeakingFilm';
import './VocalQDemo.css';

/**
 * The VocalQ tile (communication tests): the app's own SpeakingFilm (custom-components/SpeakingFilm.jsx), a face in
 * profile that speaks and then becomes a waveform, in the landing page's colours (VocalQDemo.css). The film does its own
 * looping, in-view start and reduced-motion handling. Decorative: the tile's title and sentence carry the meaning.
 */
export default function VocalQDemo() {
  return (
    <div className="fx-vq">
      <SpeakingFilm className="fx-vq-film" />
    </div>
  );
}