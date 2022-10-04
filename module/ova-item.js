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
            currentPerks.splice(currentPerks[index], 1);
        }
        currentPerks.sort((a, b) => a.name.localeCompare(b.name));
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": currentPerks }]);
    }

    prepareDerivedData() {
        super.prepareDerivedData();
        if (this.type === 'attack') return;

        this.data.effects = [];
        this.data.data.effects.forEach(e => {
            this.data.effects.push(new OVAEffect(e));
        });
    }

    /** @override */
    prepareItemData() {
        if (!this.isEmbedded) return;
        if (this.type === 'ability') this._prepareAbilittyData();
        if (this.type === 'attack') this._prepareAttackData();
    }

    _prepareAbilittyData() {
        const itemData = this.data.data;
        itemData.level.mod = 0;
        itemData.isEmbedded = this.isEmbedded;

        if (itemData.isRoot) {
            // add chilren abilities
            const abilities = this.actor.items.map(i => i.data).filter(i => i.data.rootId === this.id);
            itemData.abilities = abilities;
            itemData.abilities.sort((a, b) => {
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
        itemData.level.total = itemData.level.value + itemData.level.mod;
        this.sheet == null || this.sheet.render(false);
    }

    _prepareAttackData() {
        const itemData = this.data;

        // fill selected abilities from actor
        const selectedAbilities = itemData.data.abilities.
            map(a => this.actor.getEmbeddedDocument("Item", a._id)?.data).
            filter(a => a != undefined);

        // apply effects to attack data

        // base roll values
        const attackData = {
            roll: 2,
            dx: 1,
            endurance: 0,
        };

        selectedAbilities.forEach(a => a.effects.forEach(e => e.apply(attackData)));

        Object.assign(itemData.data, attackData);
    }
}