export default class OVAAttackSheet extends ItemSheet {
    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            dragDrop: [{ dropSelector: ".perks" }],
            template: "systems/ova/templates/sheets/ova-attack-sheet.html"
        });
    }


    activateListeners(html) {
        super.activateListeners(html);

        html.find(".perk-delete").click(this._onDelete.bind(this));
        html.find(".item-delete").click(this._onDeleteSelf.bind(this));

        html.find('.ability-description').click(this._selectAbility.bind(this));
    }

    _selectAbility(event) {
        event.preventDefault();

        var dataset = event.currentTarget.closest(".item").dataset;
        const selectionId = dataset.itemId;
        const selctionType = dataset.itemType;

        let selected = [];
        let selectedKey ="";
        if (selctionType === 'roll') {
            selectedKey = "data.rollAbilities";
            selected = this.item.data.data.rollAbilities;
        } else {
            selectedKey = "data.dxAbilities";
            selected = this.item.data.data.dxAbilities;
        }
        
        if (selected.includes(selectionId)) {
            selected = selected.filter(id => id !== selectionId);
        } else {
            selected.push(selectionId);
        }

        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.item.id, [selectedKey]: selected }]);
    }

    _onDelete(event) {
        event.preventDefault();
        const itemId = this._getItemId(event);

        this.item.removePerk(itemId);
    }
    
    _onDeleteSelf(event) {
        event.preventDefault();

        this.actor.deleteEmbeddedDocuments("Item", [this.item.id]);
    }

    _getItemId(event) {
        return event.currentTarget.closest(".item").dataset.itemId;
    }

    /** @override */
    getData() {
        const data = super.getData();

        const itemData = data.data;
        data.config = CONFIG.OVA;

        data.item = itemData;
        data.data = itemData.data;
        data.rollAbilities = itemData.data.rollAbilities;
        data.dxAbilities = itemData.data.dxAbilities;
        data.abilities = this.actor.items.
            filter(i => i.type === 'ability' && i.data.data.rootId === '').
            map(a => a.data).
            sort((a, b) => { 
                // sort by type and name
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type.localeCompare(b.type);
            });

        return data;
    }

    /** @override */
    async _canDragDrop(event) {
        return true;
    }

    /** @override */
    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const item = this.item;
        if (item.type !== 'ability') return;

        const newItem = await Item.implementation.fromDropData(data);
        const newItemData = newItem.toObject();

        if (newItemData.type !== 'perk') return;

        switch (newItemData.type) {
            case 'perk':
                const newPerks = newItemData instanceof Array ? newItemData : [newItemData];
                this.item.addPerks(newPerks);
                break;
        }
    }
}