export default class OVAActiveEffect extends ActiveEffect {
    async _onCreate(data, options, userId) {
        if (data.flags["create-item"]) {
            const itemsData = data.flags["create-item"];
            const actor = this.parent;
            const rootData = itemsData.find(i => i.data.rootId === "");
            const root = await actor.createEmbeddedDocuments("Item", [rootData]);
            this.setFlag('ova', 'linked-item',  root[0].id);
            const children = itemsData.filter(i => i.data.rootId !== "").map(i => {
                i.data.rootId = root[0].id;
                return i;
            });
            await actor.createEmbeddedDocuments("Item", children);
        }
        super._onCreate(data, options, userId);
    }

    _onDelete(options, userId) {
        const linkedItem = this.getFlag('ova', 'linked-item');

        if (linkedItem) {
            this.parent.deleteEmbeddedDocuments("Item", [linkedItem]);
        }
        super._onDelete(options, userId);
    }

    /** @override */
    get duration() {
        const d = this.data.duration;
    
        // Time-based duration
        if ( Number.isNumeric(d.seconds) ) {
          const start = (d.startTime || game.time.worldTime);
          const elapsed = game.time.worldTime - start;
          const remaining = d.seconds - elapsed;
          return {
            type: "seconds",
            duration: d.seconds,
            remaining: remaining,
            label: `${remaining} Seconds`
          };
        }
    
        // Turn-based duration
        else if ( d.rounds || d.turns ) {
    
          // Determine the current combat duration
          const cbt = game.combat;
          const c = {round: cbt?.round ?? 0, turn: cbt?.turn ?? 0, nTurns: cbt?.turns.length ?? 1};
          const current = this._getCombatTime(c.round, c.turn);
          const duration = this._getCombatTime(d.rounds, d.turns);
          const start = this._getCombatTime(d.startRound, d.startTurn, c.nTurns);
    
          // If the effect has not started yet display the full duration
          if ( current <= start ) {
            return {
              type: "turns",
              duration: duration,
              remaining: duration,
              label: this._getDurationLabel(d.rounds, d.turns)
            }
          }
    
          // Some number of remaining rounds and turns (possibly zero)
          const remaining = Math.max(((start + duration) - current).toNearest(0.01), 0);
          const remainingRounds = Math.floor(remaining);
          const remainingTurns = Math.min(((remaining - remainingRounds) * 100).toNearest(0.01), c.nTurns-1);
          return {
            type: "turns",
            duration: duration,
            remaining: remaining,
            label: this._getDurationLabel(remainingRounds, remainingTurns)
          }
        }
    
        // No duration
        else return {
          type: "none",
          duration: null,
          remaining: null,
          label: "∞"
        }
      }

    /** @override */
    _getDurationLabel(rounds, turns) {
        const parts = [];
        if ( rounds > 0 ) parts.push(`${rounds} ${game.i18n.localize(rounds === 1 ? "COMBAT.Round": "COMBAT.Rounds")}`);
        if ( turns > 0 ) parts.push(`${turns} ${game.i18n.localize(turns === 1 ? "COMBAT.Turn": "COMBAT.Turns")}`);
        // endless
        if (( rounds + turns ) === 0 ) parts.push("∞");
        return parts.filterJoin(", ");
      }
}