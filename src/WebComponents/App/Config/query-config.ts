module Vidyano.WebComponents {
    @WebComponent.register({
        properties: {
            name: String,
            id: String,
            defaultChart: String,
            template: {
                type: Object,
                readOnly: true
            }
        }
    })
    export class QueryConfig extends WebComponent {
        name: string;
        id: string;
        defaultChart: string;
        template: any;

        private _setTemplate: (template: HTMLElement) => void;

        attached() {
            super.attached();

            this._setTemplate(<HTMLElement>Polymer.dom(this).querySelector("template"));
        }
    }
}