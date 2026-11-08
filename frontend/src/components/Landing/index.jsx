import React from 'react';
import brand from '../../brand';
import DefaultLanding from './DefaultLanding';
import HouseOfAbundanceLanding from './HouseOfAbundanceLanding';

/**
 * The landing page (route "/"). Every landing page lives in this folder; the institution of the
 * build picks one with "landingPage" in its brand.json (src/brand/institutions/<name>/brand.json).
 * An institution that names none, or a page that is not listed here, gets the default page.
 *
 * To give another institution its own page:
 *   1. add <Name>Landing.jsx next to this file (copy HouseOfAbundanceLanding.jsx; the sections both
 *      pages share are in ./parts),
 *   2. list it below under the name you will use,
 *   3. put  "landingPage": "<name>"  in that institution's brand.json.
 */
const PAGES = {
  default: DefaultLanding,
  houseofabundance: HouseOfAbundanceLanding,
};

const Landing = () => {
  const Page = PAGES[brand.institution.landingPage] || PAGES.default;
  return <Page />;
};

export default Landing;
