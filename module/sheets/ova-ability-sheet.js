export default class OVAAbilitySheet extends ItemSheet {
    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            dragDrop: [{ dropSelector: ".perks" }, { dropSelector: ".items" }],
            template: "systems/ova/templates/sheets/ova-ability-sheet.html"
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(".item-delete").click(this._onDelete.bind(this));

        if (this.item.isEmbedded) {
            html.find('.item-view').click(this.actor.sheet._startEditingItem.bind(this));
            html.find('.item-edit').on("blur", this.actor.sheet._endEditingItem.bind(this));
            html.find('.item-edit').click(this.actor.sheet._editItem.bind(this));

            html.find('.item-edit').click(this.actor.sheet._editItem.bind(this));
            html.find('.item-value').on("input", this.actor.sheet._onItemValueChange.bind(this));
            html.find('.item-value').keypress(this.actor.sheet._itemValueValidator.bind(this));
            html.find('.ability-description').on("contextmenu", this.actor.sheet._editItem.bind(this));
        }
    }

    async _onSubmit(event) {
        if (this.item.isEmbedded) {
            await this.actor.sheet._onSubmit(event);
        }
        await super._onSubmit(event);
    }

    _onDelete(event) {
        event.preventDefault();
        const itemId = this._getItemId(event);

        this.item.removePerk(itemId);
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
        if (this.item.isEmbedded && this.item.type == 'ability') {
            // get abilities from actor that have this item as a root
            const abilities = this.item.actor.items.map(i => i.data).filter(i => i.data.rootId === this.item.id);
            data.abilities = abilities;
        }

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

        if (newItemData.type !== 'perk' && !item.data.data.isRoot) return;

        switch (newItemData.type) {
            case 'perk':
                const newPerks = newItemData instanceof Array ? newItemData : [newItemData];
                this.item.addPerks(newPerks);
                break;
            case 'ability':
                if (!item.data.data.isRoot) break;
                const rootId = item.data._id;
                newItemData.data.rootId = rootId;
                this.actor.createEmbeddedDocuments("Item", [newItemData]);
                break;
        }
    }
}