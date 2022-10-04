import OVAEffect from "./effects/ova-effect.js";

export const OVA = {};

OVA.abilityTypes = {
    "ability": "OVA.Ability.Name",
    "weakness": "OVA.Weakness.Name",
};

OVA.perkTypes = {
    "perk": "OVA.Perk.Name",
    "flaw": "OVA.Flaw.Name",
};

OVA.rootAbilityTypes = {
    "modifier": "OVA.Ability.Type.Modifier",
    "entity": "OVA.Ability.Type.Entity"
};

OVA.effectTargets = OVAEffect.TARGETS;
OVA.effectTypes = OVAEffect.TYPES;
OVA.activeEffectModes = Object.entries(CONST.ACTIVE_EFFECT_MODES).reduce((obj, e) => {
    obj[e[1]] = "EFFECT.MODE_" + e[0];
    return obj;
}, {});
OVA.effectApplyTypes = OVAEffect.APPLY_TYPES;