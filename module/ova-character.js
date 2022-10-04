import OVAEffect from "./effects/ova-effect.js";

export default class OVACharacter extends Actor {
    constructor(data, context) {
        data.token = {
            actorLink: true,
            disposition: 1,
            vision: true,
            bar1: { attribute: "attributes.hp" },
            bar2: { attribute: "attributes.endurance" },
        }
        super(data, context);

    }
    async createAttack() {
        const attackData = {
            name: game.i18n.localize("OVA.Attack.DefaultName"),
            type: "attack",
        };
        return this.createEmbeddedDocuments("Item", [attackData]);
    }

    async createSpell() {
        const spellData = {
            name: game.i18n.localize("OVA.Spell.DefaultName"),
            type: "spell",
        };
        return this.createEmbeddedDocuments("Item", [spellData]);
    }

    async _preUpdate(data, options, user) {
        const charData = this.data;

        const currentHP = data.data?.hp?.value || charData.data.hp.value;
        const currentEndurance = data.data?.endurance?.value || charData.data.endurance.value;

        if (currentHP <= 0 && currentEndurance <= 0) {
            foundry.utils.setProperty(data, "data.hp.value", 0)
            foundry.utils.setProperty(data, "data.endurance.value", 0);
            // TODO: death hook
        }

        if (data.data?.hp?.value < 0) {
            foundry.utils.setProperty(data, "data.endurance.value", currentEndurance + data.data.hp.value)
            foundry.utils.setProperty(data, "data.hp.value", 0)
        };
        if (data.data?.endurance?.value < 0) {
            foundry.utils.setProperty(data, "data.hp.value", currentHP + data.data.endurance.value);
            foundry.utils.setProperty(data, "data.endurance.value", 0);
        }
        if (data.data?.enduranceReserve?.value < 0) {
            foundry.utils.setProperty(data, "data.enduranceReserve.value", 0);
        }

        // show text notifications
        if (data.data?.hp?.value && data.data.hp.value != charData.data.hp.value) {
            this._showValueChangeText(data.data.hp.value - charData.data.hp.value);
        }

        if (data.data?.endurance?.value && data.data.endurance.value != charData.data.endurance.value) {
            this._showValueChangeText(data.data.endurance.value - charData.data.endurance.value, '#427ef5');
        }

        if (data.data?.enduranceReserve?.value && data.data.enduranceReserve.value != charData.data.enduranceReserve.value) {
            this._showValueChangeText(data.data.enduranceReserve.value - charData.data.enduranceReserve.value, '#427ef5');
        }
    }

    prepareData() {
        super.prepareData();

        const charData = this.data;

        charData.defenses.evasion += charData.speed;
        for (const defense in charData.defenses) {
            charData.defenses[defense] += (charData.globalDefMod + charData.globalMod);
            if (charData.defenses[defense] < 0) {
                charData.defenses[defense] = 0;
            }
        }
        if (charData.armor < 0) {
            charData.armor = 0;
        }
        charData.hasResistances = Object.keys(charData.resistances).length > 0;

        if (charData.data.hp.value > charData.hp.max) {
            charData.data.hp.value = charData.hp.max;
        }

        if (charData.data.endurance.value > charData.endurance.max) {
            charData.data.endurance.value = charData.endurance.max;
        }

        if (charData.data.enduranceReserve.value > charData.enduranceReserve.max) {
            charData.data.enduranceReserve.value = charData.enduranceReserve.max;
        }
    }

    prepareBaseData() {
        const charData = this.data;

        charData.globalMod = 2;
        charData.globalRollMod = 0;
        charData.globalDefMod = 0;
        charData.armor = 0;
        charData.resistances = {};
        charData.attacks = [];
        charData.speed = 0;

        // copy data from template
        charData.defenses = { ...charData.data.defenses };
        charData.hp = { ...charData.data.hp };
        charData.endurance = { ...charData.data.endurance };
        charData.enduranceReserve = { ...charData.data.enduranceReserve };
        charData.attack = { roll: 0, dx: 0}; // for effect compability
        charData.data.attributes = {
            hp: charData.hp,
            endurance: charData.endurance,
            enduranceReserve: charData.enduranceReserve,
        }
        charData.dramaDice = { ...charData.data.dramaDice };
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        this.items.filter(i => i.data.type === "ability").forEach(item => item.prepareItemData());
        const charData = this.data;

        // apply active ability effects to data
        this.items.forEach(item => {
            if (item.type !== "ability") return;
            if (!item.data.data.active) return;

            // sort by priority and apply effects
            item.data.ovaEffects.sort((a, b) => a.data.priority - b.data.priority).forEach(e => e.apply(charData));
        });

        // get magical abilities
        const magicAbilities = this.items.filter(item => item.data.type === 'ability' && item.data.data.magic);
        charData.magic = magicAbilities;
        charData.haveMagic = magicAbilities.length > 0;

        // save abilities that have affected defenses for future use
        if (!charData.changes) charData.changes = [];
        const defenseChanges = charData.changes.filter(change => change.key === "defenses.?" || change.key === "speed");
        charData.defenseAbilities = {}        
        defenseChanges.forEach(change => {
            // TODO: do i really need speed as separate modiefier?
            const defense = change.key === "speed" || !change.keyValue ? "evasion" : change.keyValue;
            if (!charData.defenseAbilities[defense]) charData.defenseAbilities[defense] = {};
            charData.defenseAbilities[defense][change.source.data._id] = change.source.data;
        });

        if (charData.data.hp.value <= 0 || charData.data.endurance.value <= 0) {
            charData.globalMod -= 1;
            charData.changes.push({
                source: {
                    name: game.i18n.localize("OVA.Status.No" + charData.data.hp.value <= 0 ? "HP" : "Endurance"),
                    type: "status",
                }, key: "globalMod", mode: 2, value: -1
            })
        }

        this.items.filter(i => i.data.type !== "ability").forEach(item => item.prepareItemData());

    }

    giveFreeDramaDice() {
        this.update({ "data.dramaDice.free": this.data.data.dramaDice.free + 1 });
    }

    resetUsedDramaDice() {
        this.update({ "data.dramaDice.used": 0, "data.dramaDice.free": 0 });
    }

    async useDramaDice(amount) {
        // first use all free dice than add used
        const useFree = Math.min(this.data.dramaDice.free, amount);
        const addUsed = amount - useFree;
        this.update({ "data.dramaDice.free": this.data.data.dramaDice.free- useFree, "data.dramaDice.used": this.data.data.dramaDice.used + addUsed });
    }

    getRollData() {
        return this.data;
    }

    changeHP(amount) {
        if (amount === 0) return;
        let newHp = this.data.data.hp.value + amount;

        this.update({ "data.hp.value": newHp });
    }

    changeEndurance(amount, reserve = false) {
        if (amount === 0) return;

        if (reserve) {
            let newEndurance = this.data.data.enduranceReserve.value + amount;
            this.update({ "data.enduranceReserve.value": newEndurance });
        } else {
            let newEndurance = this.data.data.endurance.value + amount;
            this.update({ "data.endurance.value": newEndurance });
        }
    }

    _showValueChangeText(amount, stroke = 0x000000) {
        const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
        for (let t of tokens) {
            t?.hud.createScrollingText(amount.signedString(), {
                icon: "icons/svg/aura.svg",
                anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
                direction: amount > 0 ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
                fill: amount > 0 ? "green" : "red",
                stroke: stroke,
                strokeThickness: 4,
                jitter: 0.25
            });
        }
    }

    async addAttackEffects(effects) {
        const oneTimeEffects = effects.filter(e => !!e.flags?.once);
        for (const e of oneTimeEffects) {
            const oneTimeEffect = e.flags["once"];
            OVAEffect.applyEffectChanges(oneTimeEffect, this.data.data)
        };

        const persistantEffect = effects.filter(e => !e.flags?.once);

        await this.update({ data: this.data.data });

        await this.createEmbeddedDocuments("ActiveEffect", persistantEffect);
    }
}