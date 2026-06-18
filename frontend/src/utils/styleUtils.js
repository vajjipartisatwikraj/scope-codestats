// styleUtils.js - Helper functions for styling and MUI integration

// This function is a utility to safely get a nested property from an object
export const getProp = (obj, path, defaultValue = undefined) => {
  const travel = (regexp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

// SwipeableViews adapter to help with MUI integration
export const swipeableViewsConfig = {
  // Add any custom configuration needed for SwipeableViews
  resistance: true,
  enableMouseEvents: true
}; 