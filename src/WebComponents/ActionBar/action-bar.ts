﻿namespace Vidyano.WebComponents {
    "use strict";

    @WebComponent.register({
        properties:
        {
            serviceObject: Object,
            pinnedActions: {
                type: Array,
                computed: "_computePinnedActions(serviceObject)"
            },
            unpinnedActions: {
                type: Array,
                computed: "_computeUnpinnedActions(serviceObject)"
            },
            hasCharts: {
                type: Boolean,
                computed: "_computeHasCharts(serviceObject.charts, app)",
                value: false
            },
            canSearch: {
                type: Boolean,
                computed: "_computeCanSearch(serviceObject)"
            },
            noActions: {
                type: Boolean,
                reflectToAttribute: true,
                computed: "_computeNoActions(pinnedActions, unpinnedActions)"
            }
        },
        forwardObservers: [
            "serviceObject.charts"
        ]
    })
    export class ActionBar extends WebComponent {
        accent: boolean = false;
        serviceObject: Vidyano.ServiceObjectWithActions;
        pinnedActions: Vidyano.Action[];
        unpinnedActions: Vidyano.Action[];
        canSearch: boolean;

        private _setHasCharts: (val: boolean) => void;

        filterActions(actions: Vidyano.Action[], pinned: boolean): Vidyano.Action[] {
            return actions.filter(a => a.isPinned === pinned);
        }

        private _computeHasCharts(charts: Vidyano.QueryChart[], app: Vidyano.WebComponents.App): boolean {
            return !!charts && !!charts.find(c => !!this.app.configuration.getQueryChartConfig(c.type));
        }

        private _search() {
            if (!this.canSearch)
                return;

            const query = <Vidyano.Query>this.serviceObject;
            query.search();
        }

        private _computePinnedActions(): (Vidyano.Action | Vidyano.ActionGroup)[] {
            return this.serviceObject && this.serviceObject.actions ? Array.from(this._transformActionsWithGroups(this.serviceObject.actions.filter(action => action.isPinned))) : [];
        }

        private _computeUnpinnedActions(): (Vidyano.Action | Vidyano.ActionGroup)[] {
            return this.serviceObject && this.serviceObject.actions ? Array.from(this._transformActionsWithGroups(this.serviceObject.actions.filter(action => !action.isPinned))) : [];
        }

        private *_transformActionsWithGroups(actions: Vidyano.Action[]): IterableIterator<Vidyano.Action | Vidyano.ActionGroup> {
            const actionGroups: { [name: string]: Vidyano.ActionGroup } = {};
            for (let i=0; i<actions.length; i++) {
                const action = actions[i];
                if (!action.group) {
                    yield action;
                    continue;
                }

                if (!actionGroups[action.group.name])
                    yield (actionGroups[action.group.name] = action.group);
            }
        }

        private _computeCanSearch(serviceObject: Vidyano.ServiceObjectWithActions): boolean {
            return serviceObject instanceof Vidyano.Query && (<Vidyano.Query>serviceObject).actions["Filter"] != null;
        }

        private _computeNoActions(pinnedActions: Vidyano.Action[], unpinnedActions: Vidyano.Action[]): boolean {
            const actions = (pinnedActions || []).concat(unpinnedActions || []);
            if (actions.length === 0)
                return true;

            return !actions.filter(a => a.isVisible).length;
        }
    }
}