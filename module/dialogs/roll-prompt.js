const TEMPLATE = 'systems/ova/templates/dialogs/roll-dialog.html';

export default class RollPrompt {
    static async RenderPrompt(title) {
        const html = await renderTemplate(TEMPLATE, {});

        return new Promise((resolve, reject) => {
            const dialog = new Dialog({
                title: title,
                content: html,
                buttons: {
                    disadvantage: {
                        icon: '<i class="fas fa-minus-circle"></i>',
                        label: game.i18n.localize('OVA.Disadvantage.Name'),
                        callback: html => {
                            const mod = html.find('#roll-modifier').val();
                            resolve(-5 + parseInt(mod));
                        }
                    },
                    normal: {
                        icon: '<i class="fas fa-check-circle"></i>',
                        label: game.i18n.localize('OVA.Normal.Name'),
                        callback: html => {
                            const mod = html.find('#roll-modifier').val();
                            resolve(0 + parseInt(mod));
                        }
                    },
                    advantage: {
                        icon: '<i class="fas fa-plus-circle"></i>',
                        label: game.i18n.localize('OVA.Advantage.Name'),
                        callback: html => {
                            const mod = html.find('#roll-modifier').val();
                            resolve(5 + parseInt(mod));
                        }
                    }
                },
                default: "normal",
                close: () => resolve(false),
            });
            dialog.render(resolve);
        });
    }
}