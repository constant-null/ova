import RollPrompt from "../dialogs/roll-prompt.js";
import CombatMessage from "../chat/combat-message.js";
import AddActiveEffectPrompt from "../dialogs/add-active-effect-dialog.js";

export default class OVACharacterSheet extends ActorSheet {
    /** @override */
    constructor(...args) {
        super(...args);
        this.selectedAbilities = [];
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/ova/templates/sheets/ova-character-sheet.html',
            tabs: [{ navSelector: ".combat-tabs", contentSelector: ".combat-content" }],
        });
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        html.find('.item-view').click(this._startEditingItem.bind(this));
        html.find('.item-edit').on("blur", this._endEditingItem.bind(this));
        html.find('.item-edit').click(this._editItem.bind(this));
        html.find('.item-value').on("input", this._onItemValueChange.bind(this));
        html.find('.item-value').keypress(this._itemValueValidator.bind(this));
        html.find('.ability-description').on("contextmenu", this._editItem.bind(this));
        html.find('.ability-name').click(this._selectAbility.bind(this));
        html.find('.ability-active').click(this._toggleAbility.bind(this));

        html.find('.roll-dice').click(this._makeManualRoll.bind(this));

        html.find('.attack-block').on("contextmenu", this._editItem.bind(this));
        html.find('.add-attack').click(this._addAttack.bind(this));
        html.find('.drama-dice').click(this._makeDramaRoll.bind(this));

        html.find('.attack-block').click(this._makeAttackRoll.bind(this));
        html.find('.defense-value').click(this._makeDefenseRoll.bind(this));

        html.find('.effect-delete').click(this._removeEffect.bind(this));
        html.find('.add-active-effect').click(this._addActiveEffect.bind(this));

        html.find('.endurance-max-value').on("focus", this._onEnduranceMaxFocus.bind(this));
        html.find('.hp-max-value').on("focus", this._onHPMaxFocus.bind(this));

        html.find('input[data-sname]').on("blur", this._onSilentInputChange.bind(this));
        html.find('.give-free-dd').click(this._giveFreeDramaDice.bind(this));
        html.find('.reset-used-dd').click(this._resetUsedDramaDice.bind(this));

        html.find('input[data-dtype="Number"]').on("keypress", this._onFieldSubmit.bind(this));
        const inputs = html.find("input");
        inputs.focus(ev => ev.currentTarget.select());
        inputs.addBack().find('[data-dtype="Number"]').change(this._onChangeInputDelta.bind(this));
    }

    _addActiveEffect(event) {
        event.preventDefault();

        const createDialog = new AddActiveEffectPrompt(this.actor);
        createDialog.render(true);
    }

    _giveFreeDramaDice(event) {
        event.preventDefault();

        new Dialog({
            title: game.i18n.localize("OVA.GiveDramaDice.Title"),
            content: `<p>${game.i18n.localize("OVA.GiveDramaDice.Description")}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("OVA.Prompt.Yes"),
                    callback: () => {
                        this.actor.update({ "data.dramaDice.free": this.actor.data.data.dramaDice.free + 1 });
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("OVA.Prompt.No"),
                    callback: () => { }
                }
            },
            default: "no"
        }).render(true);
    }

    _resetUsedDramaDice(event) {
        event.preventDefault();

        new Dialog({
            title: game.i18n.localize("OVA.ResetDramaDice.Title"),
            content: `<p>${game.i18n.localize("OVA.ResetDramaDice.Description")}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("OVA.Prompt.Yes"),
                    callback: () => {
                        this.actor.update({ "data.dramaDice.used": 0 });
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("OVA.Prompt.No"),
                    callback: () => { }
                }
            },
            default: "no"
        }).render(true);
    }

    async _onSilentInputChange(event) {
        event.preventDefault();
        const field = event.currentTarget.dataset.sname;
        const type = event.currentTarget.dataset.dtype;
        let value = event.currentTarget.value;
        if (!value) return;
        if (type === "Number") {
            value = Number.parseInt(value);
        }

        await this.actor.update({ [field]: value });
        this.render(true);
    }

    _onEnduranceMaxFocus(event) {
        event.preventDefault();

        event.currentTarget.value = this.actor.data.data.endurance.max;
    }

    _onHPMaxFocus(event) {
        event.preventDefault();
        event.currentTarget.value = this.actor.data.data.hp.max;
    }

    _onFieldSubmit(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            this.actor.prepareData();
        }
    }

    async _addAttack(e) {
        e.preventDefault();
        if (this._tabs[0].active === "combat-stats") {
            const attack = await this.actor.createAttack();
            attack[0].sheet.render(true, { editable: true });
        } else {
            const spell = await this.actor.createSpell();
            spell[0].sheet.render(true, { editable: true });
        }
    }

    _endEditingItem(e) {
        e.stopPropagation();
        e.preventDefault();

        var view = e.target.parentNode.querySelector(".item-view");
        view.classList.toggle("hidden");
        e.target.classList.toggle("hidden");
    }

    _startEditingItem(e) {
        e.stopPropagation();
        e.preventDefault();

        var input = e.target.parentNode.querySelector(".item-value");
        input.classList.toggle("hidden");
        e.target.classList.toggle("hidden");
        input.focus();
        input.select();
    }

    async _onSubmit(event, options) {
        const formData = this._getSubmitData({});

        // removing max endurance and hp

        this._submitItems(formData);
        await super._onSubmit(event, options);
    }

    _removeEffect(event) {
        event.preventDefault();

        const effectId = this._getItemId(event);
        this.actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
    }

    _submitItems(data) {
        const changedItems = []

        for (const item in data) {
            // if it start with "item-"
            if (!item.startsWith("item-")) continue;
            const itemId = item.split("-")[1];
            const itemData = data[item];

            changedItems.push({ _id: itemId, "data.level.value": itemData });
        }

        this.actor.updateEmbeddedDocuments("Item", changedItems);
    }

    _getSelectedAbilities() {
        return this.actor.items.filter(i => this.selectedAbilities.includes(i.id));
    }

    _makeDefenseRoll(event) {
        event.preventDefault();
        const defense = event.currentTarget.dataset.deftype;

        const dice = this.actor.data.defenses[defense];
        this._makeRoll({ roll: dice, type: "defense", flavor: `Defense (${defense})` });
    }

    _makeAttackRoll(event) {
        event.preventDefault();
        const attackId = this._getItemId(event);

        const attack = this.actor.items.find(i => i.id === attackId);
        if (!attack) {
            console.log(`Could not find attack with id ${attackId}`);
            return;
        }

        let effects = [];
        let type;
        if (attack.type === "spell") {
            // find child ability using rootId
            const ability = this.actor.items.find(i => i.data.data.rootId === attack.id);

            type = "spell";
            effects = [{
                label: attack.name,
                changes: [
                    {
                        key: attack.data.data.effectName,
                        value: ability.data.data.effectLevel,
                    }
                ],
                flags: {
                    "create-item": this._packAbility(ability),
                }
            }];
        } else {
            type = "attack";
            effects = attack.data.activeEffects;
        }

        this._makeRoll({ ...attack.data.attack, effects: effects, type: type, attack: attack, enduranceCost: attack.data.enduranceCost });
    }

    _makeManualRoll(event) {
        event.preventDefault();

        const rollData = {
            globalMod: this.actor.data.globalMod,
        };
        const abilities = this._getSelectedAbilities();
        const effects = []
        let enduranceCost = 0;
        for (const ability of abilities) {
            const abilityData = ability.data;
            let sign = 1;
            if (abilityData.data.type === "weakness") sign = -1;
            if (abilityData.name.toLowerCase() in rollData) {
                rollData[abilityData.name.toLowerCase()] += sign * abilityData.data.level.value;
            } else {
                rollData[abilityData.name.toLowerCase()] = sign * abilityData.data.level.value;
            }
            effects.push(...abilityData.ovaEffects);
            enduranceCost += abilityData.data.enduranceCost;
        }
        if (enduranceCost < 0) enduranceCost = 0;

        // sum roll modifiers
        let diceTotal = Object.values(rollData).reduce((a, b) => a + b, 0);

        this.selectedAbilities = [];
        this._makeRoll({ roll: diceTotal, effects: [], changes: [], enduranceCost: enduranceCost });
    }

    async _makeDramaRoll(event) {
        event.preventDefault();

        let enduranceCost = 5;
        if (this.actor.data.dramaDice.available > 0) {
            enduranceCost = 0;
        }

        this._makeRoll({ roll: 1, type: "drama", enduranceCost: enduranceCost, callback: this._onDramaDiceUse });
    }

    async _onDramaDiceUse() {
        if (this.actor.data.data.dramaDice.free > 0) {
            await this.actor.update({ "data.dramaDice.free": this.actor.data.data.dramaDice.free - 1 });
        } else {
            await this.actor.update({ "data.dramaDice.used": this.actor.data.data.dramaDice.used + 1 })
        }
    }

    async _makeRoll({ roll = 2, dv = 0, dx = 1, effects = [], enduranceCost = 0, ignoreArmor = 0, type = "manual", changes = [], attack = null, flavor = '', callback = null }) {
        const result = await new RollPrompt(flavor, type, this.actor, enduranceCost).show();
        if (result === false) return;
        callback?.bind(this)();

        // TODO: add changes to list of changes
        roll += result;
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
        dice.evaluate({ async: false })
        const rollData = {
            roll: roll,
            dx: dx,
            result: dice.result,
            ignoreArmor: ignoreArmor,
            effects: effects,
            type: type,
            dv: dv,
        };

        CombatMessage.create({ roll: dice, rollData: rollData, speaker: this.actor, attack: attack });
    }

    _packAbility(ability) {
        // find child ability using rootId
        const rootAbility = ability.toObject();
        rootAbility.data.rootId = "";
        rootAbility.data.temporary = true;
        const children = this.actor.items.
            filter(i => i.data.data.rootId === ability.id).
            map(i => i.toObject());

        return [rootAbility, ...children];
    }

    //** allow only numbers */
    _itemValueValidator(event) {
        if (event.which < 48 || event.which > 57) event.preventDefault();
    }

    _editItem(event) {
        event.preventDefault();
        const itemId = this._getItemId(event);

        const item = this.actor.items.find(i => i.id === itemId);
        if (!item) {
            console.log(`Could not find item with id ${itemId}`);
            return;
        }

        item.sheet.render(true, { editable: true });
    }

    _toggleAbility(event) {
        event.preventDefault();

        const abilityId = this._getItemId(event);
        const ability = this.actor.items.find(i => i.id === abilityId);
        if (!ability) {
            console.log(`Could not find item with id ${abilityId}`);
            return;
        }

        const newValue = !ability.data.data.active;
        const values = [{ _id: ability.id, "data.active": newValue }];

        // find children of ability
        const children = this.actor.items.filter(i => i.data.data.rootId === abilityId);
        for (const child of children) {
            values.push({ _id: child.id, "data.active": newValue });
        }

        this.actor.updateEmbeddedDocuments("Item", values);
    }

    /** shamelesly stolen from dnd5e. You have my thanks! */
    _onChangeInputDelta(event) {
        const input = event.target;
        const value = input.value;
        if (["+", "-"].includes(value[0])) {
            let delta = parseFloat(value);
            input.value = getProperty(this.actor.data, input.name) + delta;
        } else if (value[0] === "=") {
            input.value = value.slice(1);
        }
    }


    async _selectAbility(event) {
        event.preventDefault();

        const abilityId = this._getItemId(event);
        const ability = this.actor.items.find(i => i.id === abilityId);
        if (ability.data.data.passive) return;
        if (this.selectedAbilities.includes(abilityId)) {
            this.selectedAbilities = this.selectedAbilities.filter(id => id !== abilityId);
        } else {
            this.selectedAbilities.push(abilityId);
        }

        await this.actor.prepareData();
        this.render(false);
    }

    _onItemValueChange(event) {
        const itemId = this._getItemId(event);

        const item = this.actor.items.find(i => i.id === itemId);
        if (!item) {
            console.log(`Could not find item with id ${itemId}`);
            return;
        }

        let value = parseInt(event.currentTarget.value);
        value = (isNaN(value) || value == 0) ? 1 : value;

        this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "data.level.value": value }]);
    }

    _getItemId(event) {
        return event.currentTarget.closest('.item').dataset.itemId;
    }

    /** @override */
    getData() {
        const context = super.getData();
        context.config = CONFIG.OVA;
        context.actor = this.actor;
        context.data = this.actor.data;

        // TODO: move to character object?
        context.abilities = [];
        context.weaknesses = [];
        context.attacks = [];
        context.spells = [];
        context.selectedAbilities = this.selectedAbilities;
        for (const item of this.actor.items) {
            const itemData = item.data;
            if (itemData.type === "attack") {
                context.attacks.push(itemData);
                continue;
            }
            if (itemData.type === "spell") {
                context.spells.push(itemData);
                continue;
            }
            if (itemData.data.rootId != '') continue;

            if (itemData.data.type === "ability") {
                context.abilities.push(itemData);
            } else if (itemData.data.type === "weakness") {
                context.weaknesses.push(itemData);
            }
        }

        context.abilities.sort((a, b) => a.name.localeCompare(b.name));
        context.weaknesses.sort((a, b) => a.name.localeCompare(b.name));
        return context;
    }
}