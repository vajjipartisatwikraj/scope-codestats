// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Function to format days in specific order: Wed, Thu, Fri, Sat, Sun, Mon, Tue
export const formatDaysInOrder = (data) => {
  // Define the order of days (starting from Wednesday)
  const dayOrder = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];

  // Sort data based on the day abbreviation
  if (Array.isArray(data)) {
    return [...data].sort((a, b) => {
      const dayA =
        a.day ||
        new Date(a.date)
          .toLocaleDateString("en-US", { weekday: "short" })
          .substring(0, 3);
      const dayB =
        b.day ||
        new Date(b.date)
          .toLocaleDateString("en-US", { weekday: "short" })
          .substring(0, 3);
      return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
    });
  }

  return data;
};

// Helper function to get ordered days for weekly data
export const getOrderedWeeklyData = (data) => {
  if (!Array.isArray(data) || data.length === 0) return [];

  // Create an ordered template with all days
  const dayOrder = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
  const result = [];

  // Map the actual data to the ordered template
  dayOrder.forEach((dayAbbr) => {
    const matchingDay = data.find((item) => {
      const itemDay = new Date(item.date)
        .toLocaleDateString("en-US", { weekday: "short" })
        .substring(0, 3);
      return itemDay === dayAbbr;
    });

    if (matchingDay) {
      result.push(matchingDay);
    }
  });

  return result;
};

// Helper function to format time label based on timeframe
export const formatTimeLabel = (dataPoint, selectedTimeframe) => {
  if (selectedTimeframe === "weekly") {
    // Format as day of week
    return new Date(dataPoint.date).toLocaleDateString("en-US", {
      weekday: "short",
    });
  } else if (selectedTimeframe === "monthly") {
    // Format as week number in month
    const date = new Date(dataPoint.date);
    const weekNum = Math.ceil(date.getDate() / 7);
    return `Week ${weekNum}`;
  } else {
    // Format as month name for yearly view
    return new Date(dataPoint.date).toLocaleDateString("en-US", {
      month: "short",
    });
  }
};