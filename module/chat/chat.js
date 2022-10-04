import ApplyDamagePrompt from "../dialogs/apply-damage-prompt.js";

let lastAttack = null;

export const listenToAttackRoll = function (message, html, data) {
    if (!message.isRoll) return;
    const rollData = data.message.flags["roll-data"];
    if (!rollData) return;

    // record the last attack roll
    if (rollData.type === "attack") {
        html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Attack"));

        lastAttack = message;
        return;
    }

    if (rollData.type === "spell") {
        html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Spell"));
        html.find("button[data-action='apply-effect']").removeClass("hidden");

        return;
    }

    // || lastAttack.user.id === message.user.id
    if (rollData.type !== "attack" && !lastAttack) {
        html.find(".flavor-text").html(game.i18n.localize(`OVA.Roll.${rollData.type.capitalize()}`));
        return;
    }
    if (rollData.type !== "defense") {
        // replace flavor text
        html.find(".flavor-text").html(game.i18n.localize("OVA.Roll.Defense"));
    }
    const attackRollData = lastAttack.data.flags["roll-data"];

    // compare attack and defense rolls
    // if the attack roll is higher, show the attack roll
    const result = lastAttack.roll.result - message.roll.result;
    message.data.flags["attack-roll-data"] = attackRollData;

    let resultText = result > 0 ? "Hit" : "Miss";
    resultText = game.i18n.localize(`OVA.Attack.${resultText}`);
    const attackName = game.i18n.localize("OVA.Roll.Attack");
    html.
        find(".dice-total").
        append(`<br/> ${lastAttack.roll.result} (${attackName}) - ${message.roll.result} = ${result} <span style="color: ${result > 0 ? "green" : "red"}">(${resultText})</span>`);

    // enable apply damage button
    if (result > 0) {
        html.find("button[data-action='apply-damage']").removeClass("hidden");
    }

    return rollData;
}

export const chatListeners = function (message, html, data) {
    html.on("click", "button[data-action='apply-damage']", _onApplyDamageClick);
    html.on("click", "button[data-action='apply-effect']", _onApplyEffectClick);
}

async function _onApplyEffectClick(e) {
    const messageId = e.currentTarget.closest(".chat-message").dataset.messageId;
    const message = game.messages.get(messageId)
    
    const spellRoll = message.data.flags["roll-data"];

    const targets = canvas.tokens.controlled;
    targets.forEach(t => {
        const targetActor = t.actor;

        targetActor.addAttackEffects(spellRoll.effects);
    })
}

async function _onApplyDamageClick(e) {
    e.preventDefault();

    // find message id
    const messageId = e.currentTarget.closest(".chat-message").dataset.messageId;
    const message = game.messages.get(messageId)

    const target = _getMessageAuthor(message);

    const attackRoll = message.data.flags["attack-roll-data"];
    const defenseRoll = message.data.flags["roll-data"];

    const rollData = {
        attack: {
            roll: attackRoll.roll,
            dx: attackRoll.dx,
            result: attackRoll.result,
            ignoreArmor: attackRoll.ignoreArmor,
        },
        defense: {
            roll: defenseRoll.roll,
            result: defenseRoll.result,
        }
    }

    const attacker = _getMessageAuthor(lastAttack);

    const promptData = {
        effects: {
            self: attackRoll.effects.filter(e => e.target === "self"),
            target: attackRoll.effects.filter(e => e.target === "target"),
        },
        rollData: rollData,
        target: target,
        attacker: attacker,
    };

    const prompt = new ApplyDamagePrompt({ ...promptData, data: {} });
    prompt.render(true);
}

function _getMessageAuthor(message) {
    let author = null;
    if (message.data.speaker.token) {
        const authorId = message.data.speaker.token;
        author = game.scenes.active?.tokens.get(authorId)?.actor;
    }
    if (!author) {
        const authorId = message.data.speaker.actor;
        author = game.actors.get(authorId);
    }

    return author;
}

