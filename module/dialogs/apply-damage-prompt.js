export default class ApplyDamagePrompt extends Dialog {
    constructor({ effects, rollData, target, attacker }) {
        const dialogData = {
            title: game.i18n.localize('OVA.ApplyDamage'),
            buttons: {
                apply: {
                    label: game.i18n.localize('OVA.ApplyDamage'),
                    callback: html => this._applyDamage(html, data)
                }
            },
            default: "apply",
            close: () => false,
        };

        super(dialogData, {});

        this.rollData = rollData;
        this.effects = effects;
        this.target = target;
        this.attacker = attacker;

        // fill resistances from target
        this.resistances = {};
        for (const name in target.data.resistances) {
            this.resistances[name] = {
                canHeal: target.data.resistances[name].canHeal || false,
                affected: target.data.resistances[name].affected || false,
            };
        }
    }

    get template() {
        return 'systems/ova/templates/dialogs/apply-damage-dialog.html';
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.effect-active').on('change', this._onSelfEffectActiveChange.bind(this));
        html.find('.effect-duration').on('change', this._onSelfEffectDurationChange.bind(this));
        html.find('.affected').on('change', this._onAffectedChange.bind(this));
        html.find('.can-heal').on('change', this._onCanHealChange.bind(this));
    }

    _onAffectedChange(e) {
        e.preventDefault();

        const resistanceName = e.currentTarget.dataset.resName;
        this.resistances[resistanceName].affected = e.currentTarget.checked;
        this.render(false);
    }

    _onCanHealChange(e) {
        e.preventDefault();

        const resistanceName = e.currentTarget.dataset.resName;
        this.resistances[resistanceName].canHeal = e.currentTarget.checked;
        this.render(false);
    }

    _onSelfEffectActiveChange(e) {
        e.preventDefault();
        // self or target
        const effectType = e.currentTarget.dataset.effectType;
        const effectIndex = e.currentTarget.dataset.effectIndex;

        this.effects[effectType][effectIndex].active = e.currentTarget.checked;
    }

    _onSelfEffectDurationChange(e) {
        e.preventDefault();
        // self or target
        const effectType = e.currentTarget.dataset.effectType;
        const effectIndex = e.currentTarget.dataset.effectIndex;

        this.effects[effectType][effectIndex].duration.rounds = e.currentTarget.value;
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        this.damage = this._calculateDamage(this.target, this.rollData.attack, this.rollData.defense);
    }

    getData() {
        const context = super.getData();
        context.effects = this.effects;
        context.target = this.target;
        context.resistances = this.resistances;

        return context;
    }

    _calculateDamage(actor, attackRoll, defenseRoll) {
        const finalResult = attackRoll.result - defenseRoll.result;

        const armor = actor.data.armor || 0;
        const piercing = attackRoll.ignoreArmor || 0
        const effectiveArmor = Math.max(armor - piercing, 0);
        const dx = Math.max(attackRoll.dx - effectiveArmor, 0.5)

        let canHeal = false;
        let totalVulnerability = 0;
        for (const resistance in this.target.data.resistances) {
            if (!this.resistances[resistance].affected) continue;

            if (this.target.data.resistances[resistance] >= 0) {
                dx -= this.target.data.resistances[resistance];
                if (this.resistances[resistance].canHeal) {
                    canHeal = true;
                }
            } else {
                totalVulnerability += -this.target.data.resistances[resistance];
            }
        }
        if (!canHeal && dx < 0) dx = 0;

        const damage = Math.ceil(finalResult * dx);

        let bonusDamage = 0;
        if (totalVulnerability > 0) {
            bonusDamage = damage * (.5 * 2 ** (totalVulnerability - 1));
        }

        return damage + bonusDamage;
    }

    _applyDamage() {
        this.target.changeHP(-this.rollData.result.damage);
    }
}