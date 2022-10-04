export default class CombatTracker {
    static ActingNow(combatant) {
        for (const combat of game.combats.combats) {
            if (combatant.id === combat.combatant.actor.id) {
                return true;
            }
        }

        return false;
    }
}