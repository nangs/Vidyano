namespace Vidyano.WebComponents {
    "use strict";

    export interface IDialogOptions {
        hideHeader?: boolean;
    }

    export class DialogInstance {
        constructor(public options: IDialogOptions, public result: Promise<any>, private _resolve: Function, private _reject: Function) {
        }

        resolve(result?: any) {
            this._resolve(result);
        }

        reject(error?: any) {
            this._reject(error);
        }
    }

    export abstract class Dialog extends WebComponent {
        private _instance: DialogInstance;

        private _show(e: CustomEvent, details: DialogInstance) {
            this._instance = details;

            this.show(details.options);
        }

        get instance(): DialogInstance {
            return this._instance;
        }

        protected show(options: IDialogOptions) {
            // Noop
        }

        protected close(result?: any) {
            this._instance.resolve(result);
        }

        protected cancel(result?: any) {
            if (result instanceof Event)
                result = undefined;

            this._instance.reject(result);
        }

        static register(info: IWebComponentRegistrationInfo = {}): any {
            if (typeof info === "function")
                return Dialog.register({})(info);

            return (obj: Function) => {
                info.properties = info.properties || {};

                info.properties["dialog"] = {
                    type: Boolean,
                    readOnly: true,
                    reflectToAttribute: true,
                    value: true
                };

                info.listeners = info.listeners || {};
                info.listeners["show"] = "_show";

                info.keybindings = info.keybindings || {};
                if(!info.keybindings["esc"]) {
                    info.keybindings["esc"] = {
                        listener: "cancel",
                        priority: Number.MAX_VALUE
                    };
                }

                return WebComponent.register(obj, info);
            };
        }
    }

    @WebComponent.register({
        properties: {
            shown: {
                type: Boolean,
                readOnly: true,
                reflectToAttribute: true
            },
            hideHeader: {
                type: Boolean,
                readOnly: true,
                reflectToAttribute: true
            },
            _translate: {
                type: Object,
                readOnly: true,
                observer: "_translateChanged"
            }
        }
    })
    export class DialogHost extends WebComponent {
        private _translate: { x: number; y: number };
        shown: boolean;
        hideHeader: boolean;

        private _setShown: (shown: boolean) => void;
        private _setHideHeader: (hide: boolean) => void;
        private _set_translate: (translate: { x: number; y: number }) => void;

        constructor(private _dialog: Dialog) {
            super();
        }

        private _translateChanged() {
            this._dialog.style.webkitTransform = this._dialog.style.transform = "translate(" + this._translate.x + "px, " + this._translate.y + "px)";
        }

        private _track(e: PolymerTrackEvent) {
            const detail = <PolymerTrackDetail>e.detail;
            if (!e.detail.sourceEvent.srcElement.tagName.startsWith("H")) {
                e.stopPropagation();
                e.preventDefault();

                return;
            }

            if (detail.state === "track") {
                this._set_translate({
                    x: this._translate.x + detail.ddx,
                    y: this._translate.y + detail.ddy
                });
            }
            else if (detail.state === "start") {
                this.app.isTracking = true;
                if (!this._translate)
                    this._set_translate({ x: 0, y: 0 });

                this._dialog.setAttribute("dragging", "");
            }
            else if (detail.state === "end") {
                this._dialog.removeAttribute("dragging");
                this.app.isTracking = false;
            }
        }

        show(options: IDialogOptions = {}): Promise<any> {
            this._setHideHeader(!!options.hideHeader);

            Polymer.dom(this).appendChild(this._dialog);

            const dialog = <WebComponent>Polymer.dom(this).querySelector("[dialog]");

            let trackHandler: Function;
            let header: HTMLElement;

            if (dialog && !this.hideHeader) {
                header = <HTMLElement>Polymer.dom(dialog.root).querySelector("header");
                if (header) {
                    Polymer.Gestures.add(header, "track", trackHandler = this._track.bind(this));
                }
            }

            let resolve: Function;
            let reject: Function;

            const promise = new Promise((_resolve, _reject) => {
                resolve = _resolve;
                reject = _reject;

                this._setShown(true);
            }).then(result => {
                if (trackHandler)
                    Polymer.Gestures.remove(header, "track", trackHandler);

                this._setShown(false);

                Polymer.dom(this).removeChild(this._dialog);
                this._dialog = null;

                return result;
            }).catch(e => {
                if (trackHandler)
                    Polymer.Gestures.remove(header, "track", trackHandler);

                this._setShown(false);

                Polymer.dom(this).removeChild(this._dialog);
                this._dialog = null;

                if (e)
                    throw e;
            });

            this._dialog.fire("show", new DialogInstance(options, promise, resolve, reject), { bubbles: false });

            return promise;
        }
    }
}