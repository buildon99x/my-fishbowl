// Pure, canvas-free message builders for the fish-input feature. Extracted so
// the localization of register/status strings is unit-testable in Node (the
// repo has no jsdom, so anything touching the DOM/canvas cannot be tested).

/**
 * Build the post-register success message.
 * @param {'fish'|'deco'} type
 * @param {string} name - display name (already defaulted by caller)
 * @param {(key: string, vars?: Record<string, string>) => string} t
 * @returns {string}
 */
export function buildRegisterMessage(type, name, t) {
  const key = type === 'deco' ? 'register.done.deco' : 'register.done.fish';
  return t(key, { name });
}
