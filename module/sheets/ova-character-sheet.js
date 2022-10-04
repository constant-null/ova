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
        html.find('.item-edit').click(this._editItem.bind(this));
        html.find('.item-value').on("keyup paste", this._onItemValueChange.bind(this));
        html.find('.item-value').keypress(this._itemValueValidator.bind(this));
        html.find('.ability-description').on("contextmenu", this._editItem.bind(this));
        html.find('.ability-description').click(this._selectAbility.bind(this));
        html.find('.roll-dice').click(this._rollDice.bind(this));
    }

    async _rollDice(event) {
        event.preventDefault();
        
        // get all selected items
        const selectedItems = this.actor.items.filter(i => this.selectedAbilities.includes(i.id));
        
        // sum levels
        let sum = 0;
        for (const item of selectedItems) {
            sum += item.data.data.level;
        }
        
        const formula = "{" +"1d6,".repeat(sum+2) + "}";
        // roll dice
        const roll = new Roll("3d6kh");
        console.log(roll);
        roll.evaluate({ async: false })
        roll._formula = `${sum+2}d6ova`;
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

        let value = parseInt(event.currentTarget.innerHTML);
        value = (isNaN(value) || value == 0) ? 1 : value;

        this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "data.level": value }]);
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
            if (itemData.data.type === "ability") {
                context.abilities.push(itemData);
            } else if (itemData.data.type === "weakness") {
                context.weaknesses.push(itemData);
            }
        }

        return context;
    }
}