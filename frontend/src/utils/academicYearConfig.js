/**
 * Pure helpers for the academic year configuration. They do not call the
 * server: the configuration is loaded once by contexts/AcademicYearContext
 * (use the `useAcademicYear` hook in components).
 *
 * Every helper falls back to a configuration worked out from today's date
 * when it is given none.
 */

/**
 * Default configuration (used until the server answers, and if it fails)
 */
export const getDefaultConfig = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Default: Academic year starts in April (month 3)
  let academicYearStart;
  if (currentMonth >= 3) {
    academicYearStart = currentYear;
  } else {
    academicYearStart = currentYear - 1;
  }

  const yearMappings = [
    {
      graduationYear: academicYearStart + 4,
      academicYear: "First Year",
      displayName: "I Year",
    },
    {
      graduationYear: academicYearStart + 3,
      academicYear: "Second Year",
      displayName: "II Year",
    },
    {
      graduationYear: academicYearStart + 2,
      academicYear: "Third Year",
      displayName: "III Year",
    },
    {
      graduationYear: academicYearStart + 1,
      academicYear: "Fourth Year",
      displayName: "IV Year",
    },
  ];

  // Add graduated years
  for (let i = 0; i <= 5; i++) {
    yearMappings.push({
      graduationYear: academicYearStart - i,
      academicYear: "Graduated",
      displayName: "Graduated",
    });
  }

  return {
    academicYearStartMonth: 3,
    currentAcademicYear: `${academicYearStart}-${academicYearStart + 1}`,
    yearMappings,
  };
};

/**
 * Get academic year for a graduation year
 */
export const getAcademicYearForGraduation = (graduationYear, config) => {
  if (!config || !config.yearMappings) {
    config = getDefaultConfig();
  }

  const mapping = config.yearMappings.find(
    (m) => m.graduationYear === graduationYear
  );
  return mapping ? mapping.academicYear : "Graduated";
};

/**
 * Get display name for a graduation year
 */
export const getDisplayNameForGraduation = (graduationYear, config) => {
  if (!config || !config.yearMappings) {
    config = getDefaultConfig();
  }

  const mapping = config.yearMappings.find(
    (m) => m.graduationYear === graduationYear
  );
  return mapping ? mapping.displayName : "Graduated";
};

/**
 * Get all unique academic years from config
 */
export const getAllAcademicYears = (config) => {
  if (!config || !config.yearMappings) {
    config = getDefaultConfig();
  }

  const years = new Set();
  config.yearMappings.forEach((mapping) => {
    years.add(mapping.academicYear);
  });

  return Array.from(years);
};
