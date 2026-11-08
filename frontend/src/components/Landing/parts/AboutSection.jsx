import React from 'react';
import brand from '../../../brand';
import ScrollRevealText from './ScrollRevealText';

/**
 * The paragraph under the hero that reveals itself word by word as it scrolls into view:
 * "{platform} gives {institution} students a real place to write code, take assessments, ...".
 * The names come from the brand, so every institution gets its own wording of the same sentence.
 */
export default function AboutSection() {
  return (
    <section className="lp-sec-xl lp-pad bg-black">
      <div className="mx-auto max-w-6xl text-center">
        <ScrollRevealText
          segments={[
            { text: brand.codeStats.name, className: 'font-display italic' },
            { text: 'gives', className: 'font-light text-white/70' },
            { text: `${brand.names.institution} students`, className: 'italic text-white/60' },
            { text: 'a real place to', className: 'font-light text-white/70' },
            { text: 'write code,', className: 'font-semibold' },
            { text: 'take assessments,', className: 'italic text-white/80' },
            { text: 'and track progress,', className: 'font-semibold' },
            { text: 'turning everyday practice', className: 'font-light text-white/65' },
            { text: 'into measurable growth', className: 'italic' },
            { text: 'that teachers and', className: 'font-light text-white/70' },
            { text: 'students can', className: 'font-light text-white/70' },
            { text: 'actually see.', className: 'font-semibold' },
          ]}
          className="lp-about-text font-display font-normal leading-[1.25] tracking-[0.02em] text-white"
        />
      </div>
    </section>
  );
}
