export default class OVAItem extends Item {
    /** @Param []Item */
    /** @override */
    addPerks(perks) {
        const currentPerks = this.data.data.perks || [];
        currentPerks.push(...perks);
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.perks": currentPerks }]);
    }
}