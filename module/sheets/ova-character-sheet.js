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
        html.find('.ability-description').click(this._selectAbility.bind(this));
        html.find('.roll-dice').click(this._rollDice.bind(this));
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
        this._submitItems(formData);
        await super._onSubmit(event, options);
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

    _rollDice(event) {
        event.preventDefault();

        // get all selected items
        const selectedItems = this.actor.items.filter(i => this.selectedAbilities.includes(i.id));
        this.makeManualRoll(selectedItems);
    }

    makeManualRoll(abilities) {
        const rollData = {
            mod: 2
        };
        const perks = [];
        for (const ability of abilities) {
            const abilityData = ability.data;
            let sign = 1;
            if (abilityData.data.type === "weakness") sign = -1;
            if (abilityData.name.toLowerCase() in rollData) {
                rollData[abilityData.name.toLowerCase()] += sign * abilityData.data.level.value;
            } else {
                rollData[abilityData.name.toLowerCase()] = sign * abilityData.data.level.value;
            }
            if (abilityData.data.perks) {
                perks.push(...abilityData.data.perks);
            }
        }
        let enduranceCost = perks.reduce((cost, perk) => cost + perk.data.level.value * perk.data.enduranceCost, 0);

        // TODO: apply perk modifiers here

        // sum roll modifiers
        let diceTotal = Object.values(rollData).reduce((a, b) => a + b, 0);
        let negativeDice = false;
        if (diceTotal <= 0) {
            negativeDice = true;
            diceTotal = 2 - diceTotal;
        }

        // roll dice
        let roll;
        if (negativeDice) {
            roll = new Roll(`${diceTotal}d6kl`);
        } else {
            roll = new Roll(`${diceTotal}d6khs`);
        }
        roll.evaluate({ async: false })

        // TODO: execute perk effects here

        roll.toMessage({
            flavor: "OVA",
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        })
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

    _selectAbility(event) {
        event.preventDefault();

        const abilityId = this._getItemId(event);
        if (this.selectedAbilities.includes(abilityId)) {
            this.selectedAbilities = this.selectedAbilities.filter(id => id !== abilityId);
        } else {
            this.selectedAbilities.push(abilityId);
        }

        this.render(true);
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
        context.abilities = [];
        context.weaknesses = [];
        for (const item of this.actor.items) {
            const itemData = item.data;
            itemData.selected = this.selectedAbilities.includes(itemData._id);
            if (itemData.data.abilities) {
                itemData.data.abilities.forEach(a => a.data.selected = this.selectedAbilities.includes(a._id));
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