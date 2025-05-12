/**
 * Utility function for combining class names conditionally
 * Needed for shadcn-svelte components
 */
export function cn(...inputs) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(" ");
}

/**
 * Format a date for display
 * @param {string|Date} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return "";
  
  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options
  };
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  try {
    return new Intl.DateTimeFormat("en-US", defaultOptions).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

/**
 * A transition function for fly and scale effects used in dialogs and popovers
 * @param {HTMLElement} node - The DOM node to apply the transition to
 * @param {object} params - Transition parameters
 * @returns {object} Transition object with in/out functions
 */
export function flyAndScale(node, params = {}) {
  const style = getComputedStyle(node);
  const transform = style.transform === "none" ? "" : style.transform;
  
  const defaults = {
    duration: 150,
    delay: 0,
    opacity: 0,
    scale: 0.95,
    y: 0,
    x: 0
  };
  
  const config = { ...defaults, ...params };
  
  return {
    in: {
      delay: config.delay,
      duration: config.duration,
      css: (t, u) => `
        transform: ${transform} scale(${config.scale + (1 - config.scale) * t}) translate(${config.x * u}px, ${config.y * u}px);
        opacity: ${config.opacity + (1 - config.opacity) * t}
      `
    },
    out: {
      delay: 0,
      duration: config.duration,
      css: (t, u) => `
        transform: ${transform} scale(${1 - (1 - config.scale) * u}) translate(${config.x * u}px, ${config.y * u}px);
        opacity: ${1 - (1 - config.opacity) * u}
      `
    }
  };
}
