export default class OVAEffect {
    data = {};
    item = null;
    constructor(item, data) {
        /**
         * {
         * type: "apply-changes|apply-active-effect",
         * target: actor, // the target of the effect (only active effect)
         * key: "str|dex|con|int|wis|cha",
         * mode: CONST.ACTIVE_EFFECT_MODES,
         * priority: 0, // only for active effects
         * value: "1",
         * apply: "once|per-target",
         * duration: "1", // duration in rounds,only for active effects
         * }
         */
        this.data = data;
        this.item = item;
    }

    static TYPES = {
        "apply-changes": "OVA.Effects.Types.ApplyChanges",
        "apply-active-effect": "OVA.Effects.Types.ApplyActiveEffect",
    }

    static TARGETS = {
        "self": "OVA.Effects.Targets.Self",
        "target": "OVA.Effects.Targets.Target",
    }

    static APPLY_TYPES = {
        "once": "OVA.Effects.ApplyTypes.Once",
        "per-target": "OVA.Effects.ApplyTypes.PerTarget",
    }

    apply(data) {
        const { type, target, key, mode, apply, priority, duration, value } = this.data;
        data.item = this.item.data;
        data.level = this.item.data.level.value;
        if (!data.changes) data.changes = [];
        if (type === 'apply-changes') {
            let evaluatedValue = Number.fromString(OVAEffect._safeEval(data, value));

            const current = foundry.utils.getProperty(data, key) || 0;
            data.changes.push({
                source: {
                    data: this.item.data,
                    name: this.item.name,
                    type: this.item.type
                }, key: key, mode: mode, value: evaluatedValue
            });
            switch (parseInt(mode)) {
                case CONST.ACTIVE_EFFECT_MODES.ADD:
                    evaluatedValue = current + evaluatedValue;
                    break;
                case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
                    evaluatedValue = current * evaluatedValue;
                    break;
                case CONST.ACTIVE_EFFECT_MODES.DOWGRADE:
                    evaluatedValue = Math.min(current, evaluatedValue);
                    break;
                case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
                    evaluatedValue = Math.max(current, evaluatedValue);
                    break;
            }
            foundry.utils.setProperty(data, key, evaluatedValue);
        } else if (type === 'apply-active-effect') {
            if (!data.effects) data.effects = [];
            data.effects.push({
                source: {
                    uuid: this.item.uuid,
                    data: this.item.data,
                    name: this.item.name,
                    type: this.item.type,
                    level: this.item.data.level.value
                },
                ...this.data,
            });
        }
    }

    static createActiveEffect(effect, data) {
        data.item = effect.source.data;
        data.level = effect.source.level;

        const evaluatedValue = Number.fromString(OVAEffect._safeEval(data, effect.value));
        let evaluatedDuration = "";
        if (effect.duration) {
            evaluatedDuration = Number.fromString(OVAEffect._safeEval(data, effect.duration));
        }

        return {
            label: effect.source.name,
            origin: effect.source.uuid,
            changes: [{
                key: effect.key,
                mode: effect.mode,
                value: evaluatedValue,
                priority: effect.priority
            }],
            duration: {
                rounds: evaluatedDuration,
            }
        }
    }

    /** shamelesly stolen and modified from Roll.safeEval */
    static _safeEval(data, expression) {
        let result;
        try {
            // replacing all @ symbols with "data"
            expression = expression.replace(/@/g, 'data.');
            const src = 'with (sandbox) { return ' + expression + '; }';
            const evl = new Function('sandbox', 'data', src);
            result = evl({ ...Roll.MATH_PROXY }, data);
        } catch {
            result = undefined;
        }
        if (!Number.isNumeric(result)) {
            throw new Error(`Effect.safeEval produced a non-numeric result from expression "${expression}" (${result})`);
        }
        return result;
    };

    static degaultObject() {
        return {
            type: "apply-changes",
            target: "self",
            key: "",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            priority: 0,
            value: "1",
        }
    }
}