import { OVA } from "./module/config.js";

import OVAAbilitySheet from "./module/sheets/ova-ability-sheet.js";
import OVACharacterSheet from "./module/sheets/ova-character-sheet.js";
import OVANPCSheet from "./module/sheets/ova-npc-sheet.js";
import OVACharacter from "./module/ova-character.js";
import OVAPerkSheet from "./module/sheets/ova-perk-sheet.js";
import OVAItem from "./module/ova-item.js";
import OVADie from "./module/dice/ova-die.js";
import OVAAttackSheet from "./module/sheets/ova-attack-sheet.js";
import OVASpellSheet from "./module/sheets/ova-spell-sheet.js";
import OVACombatant from "./module/combat/ova-combatant.js";
import OVAEffect from "./module/effects/ova-effect.js";
import OVAActiveEffect from "./module/effects/ova-active-effect.js";
import CombatTracker from "./module/combat/tracker.js";

import * as chat from "./module/chat/chat.js";
import registerHandlebarsHelpers from "./ova-handlebars-helpers.js";
import configureStatusEffects from "./configure-status-effects.js";
import Socket from "./module/sockets/socket.js";
import OVATokenHUD from "./module/token/ova-token-hud.js";

Hooks.once("init", function () {
    console.log("OVA | Initializing OVA System");

    game.CombatTracker = CombatTracker;

    CONFIG.OVA = OVA;
    CONFIG.statusEffects = configureStatusEffects();

    CONFIG.Item.documentClass = OVAItem;
    CONFIG.Actor.documentClass = OVACharacter;
    CONFIG.Dice.types = [OVADie, FateDie]
    CONFIG.Dice.terms['d'] = OVADie;
    CONFIG.Combatant.documentClass = OVACombatant;
    CONFIG.ActiveEffect.documentClass = OVAActiveEffect;
    CONFIG.Item.typeLabels["ability"] = "OVA.Ability.Name";
    CONFIG.Item.typeLabels["perk"] = "OVA.Perk.Name";
    CONFIG.Actor.typeLabels["character"] = "OVA.Character.Name";
    CONFIG.Actor.typeLabels["npc"] = "OVA.NPC.Name";
    // CONFIG.debug.hooks = true;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("ova", OVAAbilitySheet, { types: ["ability"], label: "OVA.Ability.Name" });
    Items.registerSheet("ova", OVAPerkSheet, { types: ["perk"], label: "OVA.Perk.Name" });
    Items.registerSheet("ova", OVAAttackSheet, { types: ["attack"] });
    Items.registerSheet("ova", OVASpellSheet, { types: ["spell"] });

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("ova", OVACharacterSheet, { makeDefault: true, label: "OVA.Sheets.Character" });
    Actors.registerSheet("ova", OVANPCSheet, { label: "OVA.Sheets.NPC" });

    Socket.initialize();
    OVACharacter.listenForValueChange();
    preloadTemplates();
    registerHandlebarsHelpers();
    registerSystemSettings();
});

Hooks.on("ready", async function () {
    canvas.hud.token = new OVATokenHUD();
});

async function preloadTemplates() {
    return loadTemplates([
        "systems/ova/templates/parts/ability-list.html",
        "systems/ova/templates/parts/effects.html",
        "systems/ova/templates/parts/effect-inline-desc.html",
        "systems/ova/templates/parts/perk-list.html",
        "systems/ova/templates/parts/combat-stats.html",
    ]);
}

function registerSystemSettings() {
    game.settings.register("ova", "rulebookName", {
        name: "PDFoundry Rulebook Name",
        scope: "world",
        config: true,
        type: String,
        default: "Rulebook"
    });
}

Hooks.on("renderChatMessage", (message, html, data) => {
    if (message.roll) {
        // chat.listenToAttackRoll(message, html, data);
        chat.listenToCombatRolls(message, html, data);
    }
});

Hooks.on("chatMessage", (log, content, message) => {
    return chat.listenToCommands(log, content, message);
});

Hooks.on("renderChatLog", chat.chatListeners);

Hooks.on('preUpdateCombat', preUpdateCombat);

Hooks.on('deleteCombat', function updateCombat(combat, updateData, context, userId) {

});

async function preUpdateCombat(combat, updateData, context) {
    if (!game.user.isGM) return;
    // removing expired effects
    for (let turn of combat.turns) {
        const turnActor = turn.actor ? turn.actor : turn.token.actor;
        if (!turnActor) continue;

        for (let effect of turnActor.data.effects) {
            if (effect.data.flags["each-round"]) {
                if (updateData.turn === undefined || (effect.data.duration.startTurn == updateData.turn && (updateData.turn > combat.turn || updateData.round > combat.round))) {
                    const overTimeEffect = effect.data.flags["each-round"];
                    const newData = { data: foundry.utils.deepClone(turnActor.data.data) };
                    OVAEffect.applyEffectChanges(overTimeEffect, newData)

                    await turnActor.update(newData);
                    await turnActor.sheet?.refreshActiveEffects(effect);
                }
            }
        }

        turnActor.clearExpiredEffects();
    }
}
