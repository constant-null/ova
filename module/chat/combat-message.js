export default class OVACombatMessage extends ChatMessage {
    static async create({flavor, roll, rollData, attack }) {
        const templateData = {
            attack: attack,
            rollResults: await roll.render({ isPrivate: false })
        };
        const html = await renderTemplate("systems/ova/templates/chat/combat-message.html", templateData);
        const msgData = {
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            user: game.user.data._id,
            flavor: flavor,
            roll: roll,
            content: html,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flags: { "roll-data": rollData },
        };
        super.applyRollMode(msgData, game.settings.get("core", "rollMode"));
        return super.create(msgData);
    }
}