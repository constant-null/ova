export  default class OVAPerkSheet extends ItemSheet {
    /** @override */
    get template() {
        return 'systems/ova/templates/sheets/ova-perk-sheet.html';
    }

    /** @override */
    getData() {
        const data = super.getData();

        const itemData = data.data;
        data.config = CONFIG.OVA;

        data.item = itemData;
        data.data = itemData.data;
        return data;
    }
}