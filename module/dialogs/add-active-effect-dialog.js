import OVAEffect from "../effects/ova-effect.js";

export default class AddActiveEffectPrompt extends Dialog {
    constructor(actor) {
        const dialogData = {
            title: game.i18n.localize('OVA.AddActiveEffect'),
            content: "html",
            buttons: {
                create: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('OVA.Create'),
                    callback: html => this._createEffect(html)
                }
            },
            default: "create",
            close: () => this._close,
        };
        super(dialogData, {});

        this.actor = actor;
        this.effect = OVAEffect.degaultObject();
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
          classes: ["dnd5e"],
          template: "systems/dnd5e/templates/apps/ability-config.html",
          width: 500,
          height: "auto"
        });
      }

    get template() {
        return 'systems/ova/templates/dialogs/add-active-effect-dialog.html';
    }

    activateListeners(html) {
        html.find('.effect-key-select').change(ev => {
            if (ev.currentTarget.value.indexOf("?") !== -1) {
                html.find('.effect-key-value').removeClass('hidden');
            } else {
                html.find('.effect-key-value').addClass('hidden');
            }
        });
        super.activateListeners(html);
    }

    getData() {
        const data = super.getData();

        data.config = CONFIG.OVA;
        data.effect = this.effect;

        return data;
    }

    _createEffect(html) {
        const form = html[0].querySelector('form');
        const formData = new FormDataExtended(form);
        const data =formData.toObject();
        const effect = {
            active: true,
            source: {
                name: data['name'],
                data: {},
                level: 0,
            },
            overTime: {
                when: "each-round",
            }
        }
        for (const key in data) {
            foundry.utils.setProperty({effect: effect}, key, data[key]);
        }

        const af = OVAEffect.createActiveEffect(effect, this.actor.data);

        this.actor.addAttackEffects([af]);
    }
}