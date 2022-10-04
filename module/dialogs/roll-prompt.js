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

        const dramaButtons = {
            drama: {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('OVA.Roll.Drama') + ' (5)',
                callback: html => this._makeRoll(html, 0)
            },
            miracle: {
                icon: '<i class="fas fa-dice"></i>',
                label: game.i18n.localize('OVA.Roll.Miracle') + ' (30)',
                callback: html => this._makeRoll(html, 5)
            }
        }

        const advRoll = type !== 'spell' && type !== 'drama'
        let buttons = advRoll ? advRollButtons : stdButtons;
        let defButton = advRoll ? 'normal' : 'roll';

        buttons = type === 'drama' ? dramaButtons : buttons;
        defButton = type === 'drama' ? 'drama' : defButton;

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
        if (this.type === 'drama' && data.enduranceCost > 0) {
            data.enduranceCost = `${this.enduranceCost}/${this.enduranceCost * 6}`;
        }
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

        if (this.type === 'drama') {
            this.enduranceCost += this.enduranceCost * adv;
        }
        this.actor.changeEndurance(-this.enduranceCost, this.selection.reserve);
    }

    async show() {
        this.render(true);
        return new Promise(resolve => this.resolve = resolve);
    }
}