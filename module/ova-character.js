export default class OVACharacter extends Actor {
    prepareData() {
        super.prepareData();
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        console.log("character initialized");

        this.items.forEach(item => item.prepareItemData());
    }
}