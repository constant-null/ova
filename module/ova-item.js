import OVAEffect from './effects/effect.js';
export default class OVAItem extends Item {
    /** @Param []Item */
    addPerks(perks) {
        const currentPerks = this.data.data.perks || [];
        // increase level by one or add there is no perk with the same name
        perks.forEach(p => {
            const index = currentPerks.findIndex(pk => pk.name === p.name);
            if (index === -1) {
                currentPerks.push(p);
            } else {
                currentPerks[index].data.level.value += 1;
            }
        });
        currentPerks.sort((a, b) => a.name.localeCompare(b.name));
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": currentPerks }]);
    }

    // removing single perk with specified id
    removePerk(perkId) {
        const currentPerks = this.data.data.perks || [];

        // reduce level by one or remove if level is 1
        const index = currentPerks.findIndex(p => p._id === perkId);
        if (currentPerks[index].data.level.value > 1) {
            currentPerks[index].data.level.value--;
        } else {
            // remove perk at index
            currentPerks.splice(index, 1);
        }
        currentPerks.sort((a, b) => a.name.localeCompare(b.name));
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": currentPerks }]);
    }

    prepareDerivedData() {
        super.prepareDerivedData();
        const itemData = this.data;

        itemData.effects = [];
        let enduranceCost = 0;
        if (itemData.type === 'attack' || itemData.type === 'ability') {
            itemData.data.perks.forEach(p => {
                enduranceCost += p.data.level.value * p.data.enduranceCost;
                p.data.effects.forEach(e => {
                    itemData.effects.push(new OVAEffect(p, e));
                });
            });
        }
        if (enduranceCost < 0) enduranceCost = 0;
        itemData.enduranceCost = enduranceCost;

        if (this.type === 'perk' || this.type === 'ability') {
            itemData.effects = [];
            itemData.data.effects.forEach(e => {
                itemData.effects.push(new OVAEffect(itemData, e));
            });
        }
    }

    /** @override */
    prepareItemData() {
        if (!this.isEmbedded) return;
        if (this.type === 'ability') this._prepareAbilittyData();
        if (this.type === 'attack') this._prepareAttackData();
        if (this.type === 'spell') this._prepareSpellData();
    }

    _prepareSpellData() {
        const data = this.data.data;
        const abilities = this.actor.items.map(i => i.data).filter(i => i.data.rootId === this.id);
        data.abilities = abilities;
        this.sheet == null || this.sheet.render(false);
    }

    _prepareAbilittyData() {
        const data = this.data.data;
        data.level.mod = 0;
        data.isEmbedded = this.isEmbedded;

        if (data.isRoot) {
            // add child abilities
            const abilities = this.actor.items.map(i => i.data).filter(i => i.data.rootId === this.id);
            data.abilities = abilities;
            data.abilities.sort((a, b) => {
                // sort by type and name
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type.localeCompare(b.type);
            });
        }
        //  else if (itemData.rootId == '') {
        //     // add abilities with the same name
        //     const modifierRoots = this.actor.items.filter(i => i.data.data.isRoot && i.data.data.rootType == 'modifier' && i.data.data.active).map(i => i.id);
        //     // find abilities with modifier roots
        //     const abilities = this.actor.items.filter(i => i.data.name === this.name && modifierRoots.includes(i.data.data.rootId));
        //     itemData.level.mod = abilities.reduce((sum, a) => sum + a.data.data.level.value, 0);
        // }
        data.level.total = data.level.value + data.level.mod;
        this.sheet == null || this.sheet.render(false);
    }

    _onDelete() {
        super._onDelete();
        if (this.data.data.isRoot) {
            const abilities = this.actor.items.filter(i => i.data.data.rootId === this.id).map(i => i.id);
            this.actor.deleteEmbeddedDocuments("Item", abilities)
        }
    }

    static async createDialog(data={}, {parent=null, pack=null, ...options}={}) {

        // Collect data
        const documentName = this.metadata.name;
        const types = ["ability", "perk"];
        const folders = parent ? [] : game.folders.filter(f => (f.data.type === documentName) && f.displayed);
        const label = game.i18n.localize(this.metadata.label);
        const title = game.i18n.format("DOCUMENT.Create", {type: label});
    
        // Render the document creation form
        const html = await renderTemplate(`templates/sidebar/document-create.html`, {
          name: data.name || game.i18n.format("DOCUMENT.New", {type: label}),
          folder: data.folder,
          folders: folders,
          hasFolders: folders.length >= 1,
          type: data.type || types[0],
          types: types.reduce((obj, t) => {
            const label = CONFIG[documentName]?.typeLabels?.[t] ?? t;
            obj[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
            return obj;
          }, {}),
          hasTypes: types.length > 1
        });
    
        // Render the confirmation dialog window
        return Dialog.prompt({
          title: title,
          content: html,
          label: title,
          callback: html => {
            const form = html[0].querySelector("form");
            const fd = new FormDataExtended(form);
            foundry.utils.mergeObject(data, fd.toObject(), {inplace: true});
            if ( !data.folder ) delete data["folder"];
            if ( types.length === 1 ) data.type = types[0];
            return this.create(data, {parent, pack, renderSheet: true});
          },
          rejectClose: false,
          options: options
        });
      }

    _prepareAttackData() {
        const itemData = this.data;

        // fill selected abilities from actor
        const selectedAbilities = itemData.data.abilities.
            map(a => this.actor.getEmbeddedDocument("Item", a)?.data).
            filter(a => a != undefined && a.data.active);

        // add selected on sheet abilities
        if (this.actor.sheet) {
            const additionalAbilities = this.actor.sheet._getSelectedAbilities();
            selectedAbilities.push(...additionalAbilities.filter(a => !itemData.data.abilities.includes(a.id)));
        }

        selectedAbilities.forEach(a => a.effects.forEach(e => itemData.effects.push(e)));

        // base roll values
        const attackData = {
            roll: this.actor.data.globalMod + this.actor.data.globalRollMod,
            dx: 1
        };


        // apply effects to attack data
        itemData.effects.forEach(e => e.apply(attackData));
        Object.assign(itemData, attackData);
    }
}