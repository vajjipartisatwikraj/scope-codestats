import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Cache for academic year configuration
let cachedConfig = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch academic year configuration from backend
 */
export const getAcademicYearConfig = async (token) => {
  try {
    // Return cached config if still valid
    if (cachedConfig && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      return cachedConfig;
    }

    const response = await axios.get(
      `${apiUrl}/leaderboard/academic-year-config`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.data.success) {
      cachedConfig = response.data.config;
      cacheTime = Date.now();
      return cachedConfig;
    }

    throw new Error("Failed to fetch academic year configuration");
  } catch (error) {
    console.error("Error fetching academic year config:", error);

    // Return default configuration if API fails
    return getDefaultConfig();
  }
};

/**
 * Get default configuration (fallback)
 */
const getDefaultConfig = () => {
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

/**
 * Clear the cache (useful when config is updated)
 */
export const clearConfigCache = () => {
  cachedConfig = null;
  cacheTime = null;
};
