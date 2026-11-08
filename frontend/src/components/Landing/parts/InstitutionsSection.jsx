import React from 'react';
import brand from '../../../brand';

/**
 * The institution's logo (and address, when it has one). The "Institutions / Collaborated with
 * institutions." heading above it can be switched off in brand.json: "landing.hideInstitutionsHeading".
 */
export default function InstitutionsSection() {
  const landing = brand.institution.landing || {};
  return (
    <section className="lp-sec lp-pad bg-black">
      <div className="mx-auto max-w-5xl text-center">
        {!landing.hideInstitutionsHeading ? (
          <>
            <div className="mb-6 text-xs uppercase tracking-[0.25em] text-white/60">Institutions</div>
            <h2 className="lp-h2 lp-h2-sm font-display">
              Collaborated with <span className="italic text-white/70">institutions.</span>
            </h2>
          </>
        ) : null}
        <div className={`flex flex-col items-center text-center ${landing.hideInstitutionsHeading ? '' : 'mt-10 md:mt-12'}`}>
          <img
            src={brand.institution.logo}
            alt={brand.names.institutionFull}
            className="h-auto w-full object-contain"
            style={{ maxWidth: 'min(100%, 600px)' }}
          />
          {brand.institution.address ? (
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">{brand.institution.address}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
