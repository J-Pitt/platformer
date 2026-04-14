/**
 * Ability gates for doors, teleports, and future logic volumes.
 *
 * Room object optional fields:
 *   requiresAbilities: ['dash', 'doubleJump']  — all must be held by the overlapping player
 */

/**
 * @param {{ hasAbility: (id: string) => boolean }} player
 * @param {string[]|undefined|null} requires
 */
export function meetsAbilityRequirements(player, requires) {
  if (!requires || requires.length === 0) return true;
  if (!player || typeof player.hasAbility !== 'function') return false;
  return requires.every((a) => player.hasAbility(a));
}
