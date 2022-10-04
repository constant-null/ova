import OVACharacterSheet from "./ova-character-sheet.js";

export default class OVANPCSheet extends OVACharacterSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/ova/templates/sheets/ova-npc-sheet.html',
            height: 500,
        });
    }

    getData() {
        const data = super.getData();

        data.abilities.push(...data.weaknesses);

        return data;
    }
}