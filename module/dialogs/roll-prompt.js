export default class RollPrompt extends Dialog {
    resolve = null;
    constructor(title, type, actor, enduranceCost) {
        const advRollButtons = {
            disadvantage: {
                icon: '<i class="fas fa-minus-circle"></i>',
                label: game.i18n.localize('OVA.Disadvantage.Name'),
                callback: html => this._makeRoll(html, -5)
            },
            normal: {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('OVA.Normal.Name'),
                callback: html => this._makeRoll(html, 0)
            },
            advantage: {
                icon: '<i class="fas fa-plus-circle"></i>',
                label: game.i18n.localize('OVA.Advantage.Name'),
                callback: html => this._makeRoll(html, 5)
            }
        };

        const stdButtons = {
            roll: {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('OVA.MakeRoll'),
                callback: html => this._makeRoll(html, 0)
            }
        }

        const advRoll = type !== 'spell' && type !== 'drama'
        const buttons = advRoll ? advRollButtons : stdButtons;
        const defButton =advRoll ? 'normal' : 'roll';

        const dialogData = {
            title: title,
            content: "html",
            buttons: buttons,
            default: defButton,
            close: () => this._close,
        };
        super(dialogData, {});

        this.actor = actor;
        this.type = type;
        this.enduranceCost = enduranceCost;
        this.selection = {
            base: true,
            reserve: false,
        }
        this.advRoll = advRoll;
    }

    get template() {
        return 'systems/ova/templates/dialogs/roll-dialog.html';
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.base-end').click(this._baseEnduranceSelect.bind(this));
        html.find('.end-reserve').click(this._enduranceReserveSelect.bind(this));
    }

    _baseEnduranceSelect(event) {
        event.preventDefault();
        this.selection = {
            base: true,
            reserve: false,
        }
        this.render(true);
    }
    _enduranceReserveSelect(event) {
        event.preventDefault();
        this.selection = {
            base: false,
            reserve: true,
        }
        this.render(true);
    }


    getData() {
        const data = super.getData();
        data.actor = this.actor;
        data.enduranceCost = this.enduranceCost;
        data.selection = this.selection;
        data.type = this.type;
        data.advRoll = this.advRoll;

        return data;
    }

    _close() {
        this.resolve(false);
    }

    _makeRoll(html, adv) {
        let mod = parseInt(html.find('#roll-modifier').val());
        if (isNaN(mod)) mod = 0;
        this.resolve && this.resolve(adv + mod);            
        this.actor.changeEndurance(-this.enduranceCost, this.selection.reserve);
    }

    async show() {
        this.render(true);
        return new Promise(resolve => this.resolve = resolve);
    }
}