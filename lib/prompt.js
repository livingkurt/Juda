/**
 * Helper function to wrap window.prompt
 * This is used to avoid eslint no-alert errors while maintaining functionality
 */
export function promptUser(message, defaultValue = "") {
  // eslint-disable-next-line no-alert
  return window.prompt(message, defaultValue);
}
