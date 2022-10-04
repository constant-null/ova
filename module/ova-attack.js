export default class OVAAttack extends OVAItem {
    updateRollAbilities(abilities) {
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.abilities": abilities }]);
    }

    updateDXAbilities(abilities) {
        this.actor.updateEmbeddedDocuments("Item", [{ _id: this.id, "data.abilities": abilities }]);
    }

    prepareDerivedData() {
        console.log("OVAItem prepareItemData");
        super.prepareDerivedData();

        const data = this.data;
        data.roll = 0;
        data.dx = 0;
        data.endurance = 0;
    }
}