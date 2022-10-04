export default class OVACombatMessage extends ChatMessage {
    static lastAttack = null;

    /** @override */
    static async create({ roll, rollData, speaker, attack }) {
        const attackData = attack?.toObject();
        const templateData = {
            attack: attackData,
            rollResults: await roll.render({ isPrivate: false })
        };
        const html = await renderTemplate("systems/ova/templates/chat/combat-message.html", templateData);
        const msgData = {
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            user: game.user.data._id,
            flavor: game.i18n.localize(`OVA.Roll.${rollData.type.capitalize()}`),
            roll: roll,
            content: html,
            speaker: ChatMessage.getSpeaker({ actor: speaker }),
            flags: { "roll-data": rollData, "attack": attackData },
        };
        super.applyRollMode(msgData, game.settings.get("core", "rollMode"));
        return super.create(msgData);
    }

    static async addDramaDice(originalRoll, dramaRoll) {
        originalRoll.roll.dice[0].results.forEach(r => r.discarded = false);
        originalRoll.roll.dice[0].results.push(...dramaRoll.roll.dice[0].results);
        for (let i = 0; i < originalRoll.roll.dice[0].results.length; i++) {
            delete originalRoll.roll.dice[0].results[i].discarded;
            originalRoll.roll.dice[0].results[i].active = true;
        }
        originalRoll.roll.dice[0]._evaluateModifiers();
        originalRoll.roll._total = originalRoll.roll._evaluateTotal();
        const attack = originalRoll.data.flags["attack"];
        const templateData = {
            attack: attack,
            rollResults: await originalRoll.roll.render({ isPrivate: false })
        };
        originalRoll.data.content = await renderTemplate("systems/ova/templates/chat/combat-message.html", templateData);
        return originalRoll;
    }
}