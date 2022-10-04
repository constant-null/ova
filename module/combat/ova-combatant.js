export default class OVACombatant extends Combatant {
    /** @override */
    getInitiativeRoll(formula) {
        const rollData = this.actor?.getRollData() || {};
        const speed = rollData.speed;

        let roll = 2 + speed;
        let negativeDice = false;
        if (roll <= 0) {
            negativeDice = true;
            roll = 2 - roll;
        }

        // roll dice
        let dice;
        if (negativeDice) {
            dice = new Roll(`${roll}d6kl`);
        } else {
            dice = new Roll(`${roll}d6khs`);
        }
        return dice;
    }
}