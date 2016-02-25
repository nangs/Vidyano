module Vidyano.WebComponents {
    var _documentClosePopupListener: EventListener;
    document.addEventListener("mousedown", _documentClosePopupListener = e => {
        var el = <HTMLElement>e.target;
        var popup: Popup;

        while (true) {
            if (!el || el == <any>document) {
                WebComponents.PopupCore.closeAll();
                break;
            }
            else if ((<any>el).__Vidyano_WebComponents_PopupCore__Instance__ && (<WebComponents.PopupCore><any>el).open)
                break;
            else if ((<any>el).popup && (<any>el).popup.__Vidyano_WebComponents_PopupCore__Instance__ && (<WebComponents.PopupCore>(<any>el).popup).open)
                break;
            else
                el = el.parentElement;
        }
    });
    document.addEventListener("touchstart", _documentClosePopupListener);

    @WebComponent.register({
        properties: {
            disabled: {
                type: Boolean,
                reflectToAttribute: true
            },
            open: {
                type: Boolean,
                readOnly: true,
                reflectToAttribute: true,
                notify: true
            },
            sticky: {
                type: Boolean,
                reflectToAttribute: true
            },
            contentAlign: {
                type: String,
                reflectToAttribute: true
            },
            orientation: {
                type: String,
                reflectToAttribute: true,
                value: "auto"
            },
            hover: {
                type: Boolean,
                reflectToAttribute: true,
                readOnly: true,
                observer: "_hoverChanged"
            }
        },
        listeners: {
            "mouseenter": "_contentMouseEnter",
            "mouseleave": "_contentMouseLeave",
            "click": "_catchContentClick"
        }
    })
    export class PopupCore extends WebComponent {
        private static _isBuggyGetBoundingClientRect: boolean;
        private static _openPopups: Vidyano.WebComponents.PopupCore[] = [];

        private __Vidyano_WebComponents_PopupCore__Instance__ = true;
        private _resolver: Function;
        private _closeOnMoveoutTimer: number;
        private _currentTarget: HTMLElement | WebComponent;
        private _currentContent: HTMLElement;
        protected _currentOrientation: string;
        open: boolean;
        orientation: string;
        contentAlign: string;
        disabled: boolean;
        sticky: boolean;
        hover: boolean;
        boundingTarget: HTMLElement;

        protected _setOpen: (val: boolean) => void;
        private _setHover: (val: boolean) => void;

        popup(target: HTMLElement | WebComponent): Promise<any> {
            if (this.open)
                return Promise.resolve();

            return new Promise(resolve => {
                this._resolver = resolve;
                this._open(target);
            });
        }

        protected _open(target: HTMLElement | WebComponent, content: HTMLElement = this) {
            if (this.open || this.hasAttribute("disabled"))
                return;

            this._currentOrientation = this.orientation.toUpperCase() === "AUTO" ? !this._findParentPopup() ? "vertical" : "horizontal" : this.orientation.toLowerCase();

            if (this.fire("popup-opening", null, { bubbles: false, cancelable: true }).defaultPrevented)
                return;

            // Close non-parent popups
            var parentPopup = this._findParentPopup();
            var firstOpenNonParentChild = Popup._openPopups[parentPopup == null ? 0 : Popup._openPopups.indexOf(parentPopup) + 1];
            if (firstOpenNonParentChild != null)
                firstOpenNonParentChild.close();

            // Position content
            var {targetRect, transformedRect} = this._getTargetRect(<HTMLElement>target);
            var windowWidth = window.innerWidth;
            var windowHeight = window.innerHeight;
            var contentWidth = content.offsetWidth;
            var contentHeight = content.offsetHeight;

            let boundWidth = windowWidth;
            let boundHeight = windowHeight;
            let boundLeft = 0;
            if (this.boundingTarget) {
                const boundTargetRect = this._getTargetRect(this.boundingTarget);
                boundWidth = boundTargetRect.targetRect.right;
                boundHeight = boundTargetRect.targetRect.bottom;
                boundLeft = boundTargetRect.targetRect.left;
            }

            var alignments = (this.contentAlign || "").toUpperCase().split(" ");
            var alignCenter = alignments.indexOf("CENTER") >= 0;
            var alignRight = alignments.indexOf("RIGHT") >= 0;

            if (this._currentOrientation == "vertical") {
                if (alignRight ? (targetRect.right - contentWidth) < 0 : targetRect.left + (transformedRect ? transformedRect.left : 0) + contentWidth <= boundWidth) {
                    // Left-align
                    var left = targetRect.left;
                    if (this.boundingTarget && transformedRect && (left + transformedRect.left < boundLeft))
                        left += boundLeft - left - transformedRect.left;

                    if (alignments.indexOf("CENTER") >= 0)
                        left = Math.max(0, left - contentWidth / 2 + targetRect.width / 2);

                    content.style.left = left + "px";
                    content.style.right = "auto";

                    content.classList.add("left");
                    content.classList.remove("right");
                }
                else {
                    // Right-align
                    content.style.left = "auto";

                    let right = (!transformedRect ? windowWidth : transformedRect.width) - (targetRect.left + targetRect.width);
                    if (this.boundingTarget)
                        right += (transformedRect ? transformedRect.left : 0) + targetRect.left + targetRect.width - boundWidth;

                    if (right < 0)
                        right = 0;

                    content.style.right = right + "px";
                    content.classList.add("right");
                    content.classList.remove("left");
                }

                if (targetRect.top + targetRect.height + contentHeight < boundHeight) {
                    // Top-align
                    content.style.top = (targetRect.top + targetRect.height) + "px";
                    content.style.bottom = "auto";

                    content.classList.add("top");
                    content.classList.remove("bottom");
                }
                else {
                    // Bottom-align
                    content.style.top = "auto";
                    content.style.bottom = Math.max(windowHeight - targetRect.top, 0) + "px";

                    content.classList.add("bottom");
                    content.classList.remove("top");
                }
            }
            else if (this._currentOrientation == "horizontal") {
                if (alignRight ? (targetRect.right - contentWidth) < 0 : targetRect.left + targetRect.width + contentWidth <= boundWidth) {
                    // Left-align
                    content.style.left = (targetRect.left + targetRect.width) + "px";
                    content.style.right = "auto";

                    content.classList.add("left");
                    content.classList.remove("right");
                }
                else {
                    // Right-align
                    content.style.left = "auto";
                    content.style.right = Math.max(windowWidth - targetRect.left, 0) + "px";

                    content.classList.add("right");
                    content.classList.remove("left");
                }

                if (targetRect.top + contentHeight < boundHeight) {
                    // Top-align
                    content.style.top = targetRect.top + "px";
                    content.style.bottom = "auto";

                    content.classList.add("top");
                    content.classList.remove("bottom");
                }
                else {
                    // Bottom-align
                    content.style.top = "auto";
                    content.style.bottom = Math.max(windowHeight - targetRect.bottom, 0) + "px";

                    content.classList.add("bottom");
                    content.classList.remove("top");
                }
            }

            this._currentTarget = target;
            this._currentContent = content;

            this._setOpen(true);
            PopupCore._openPopups.push(this);

            this.fire("popup-opened", null, { bubbles: false, cancelable: false });
        }

        protected _getTargetRect(target: HTMLElement): { targetRect: ClientRect, transformedRect?: ClientRect } {
            var targetRect = target.getBoundingClientRect();
            if (target === this) {
                targetRect = {
                    left: targetRect.left,
                    top: targetRect.top,
                    bottom: targetRect.top,
                    right: targetRect.left,
                    width: 0,
                    height: 0
                };
            }

            if (Popup._isBuggyGetBoundingClientRect === undefined) {
                var outer = document.createElement("div");
                outer.style.webkitTransform = outer.style.transform = "translate(-100px, -100px)";

                var inner = document.createElement("div");
                inner.style.position = "fixed";

                outer.appendChild(inner);

                document.body.appendChild(outer);
                var outerRect = outer.getBoundingClientRect();
                var innerRect = inner.getBoundingClientRect();
                document.body.removeChild(outer);

                Popup._isBuggyGetBoundingClientRect = outerRect.left === innerRect.left;
            }

            if (Popup._isBuggyGetBoundingClientRect) {
                var parent = target.parentElement;
                while (parent != null) {
                    var computedStyle = getComputedStyle(parent, null),
                        transform = <string>(computedStyle.transform || computedStyle.webkitTransform);

                    if (transform.startsWith("matrix")) {
                        var transformedParentRect = parent.getBoundingClientRect();

                        return {
                            targetRect: {
                                top: targetRect.top - transformedParentRect.top,
                                left: targetRect.left - transformedParentRect.left,
                                right: targetRect.right - transformedParentRect.right,
                                bottom: targetRect.bottom - transformedParentRect.bottom,
                                width: targetRect.width,
                                height: targetRect.height
                            },
                            transformedRect: transformedParentRect
                        };
                    }

                    parent = parent.parentElement;
                }
            }

            return { targetRect: targetRect };
        }

        close() {
            if (!this.open || this.fire("popup-closing", null, { bubbles: false, cancelable: true }).defaultPrevented)
                return;

            if (!this.open && this._closeOnMoveoutTimer) {
                clearTimeout(this._closeOnMoveoutTimer);
                this._closeOnMoveoutTimer = undefined;
            }

            var openChild = Popup._openPopups[Popup._openPopups.indexOf(this) + 1];
            if (openChild != null)
                openChild.close();

            this._currentTarget = this._currentContent = null;
            this._setOpen(false);

            if (this._resolver)
                this._resolver();

            Popup._openPopups.remove(this);

            this.fire("popup-closed", null, { bubbles: false, cancelable: false });
        }

        protected _findParentPopup(): Popup {
            var element = this.parentNode;
            while (element != null && Popup._openPopups.indexOf(<any>element) == -1)
                element = (<any>element).host || element.parentNode;

            return <Popup><any>element;
        }

        private _catchContentClick(e?: Event) {
            if (this.sticky)
                e.stopPropagation();
        }

        protected _contentMouseEnter(e: MouseEvent) {
            if (this._setHover)
                this._setHover(true);

            if (this._closeOnMoveoutTimer) {
                clearTimeout(this._closeOnMoveoutTimer);
                this._closeOnMoveoutTimer = undefined;
            }
        }

        protected _contentMouseLeave(e: MouseEvent) {
            if (this._setHover)
                this._setHover(false);

            if (!this.sticky) {
                this._closeOnMoveoutTimer = setTimeout(() => {
                    this.close();
                }, 300);
            }
        }

        private _hoverChanged(hover: boolean) {
            this.toggleAttribute("hover", hover, this._currentTarget);
        }

        static closeAll(parent?: HTMLElement | WebComponent) {
            var rootPopup = Popup._openPopups[0];
            if (rootPopup && (!parent || Popup._isDescendant(<HTMLElement>parent, rootPopup)))
                rootPopup.close();
        }

        private static _isDescendant(parent: HTMLElement, child: HTMLElement): boolean {
            var node = child.parentNode;
            while (node != null) {
                if (node == parent)
                    return true;

                node = node.parentNode;
            }

            return false;
        }
    }

    @WebComponent.register({
        properties: {
            disabled: {
                type: Boolean,
                reflectToAttribute: true
            },
            open: {
                type: Boolean,
                readOnly: true,
                reflectToAttribute: true,
                notify: true
            },
            sticky: {
                type: Boolean,
                reflectToAttribute: true
            },
            autoSizeContent: {
                type: Boolean,
                reflectToAttribute: true
            },
            openOnHover: {
                type: Boolean,
                reflectToAttribute: true,
                value: false
            },
            contentAlign: {
                type: String,
                reflectToAttribute: true
            },
            orientation: {
                type: String,
                reflectToAttribute: true,
                value: "auto"
            }
        },
        observers: [
            "_hookTapAndHoverEvents(isAttached, openOnHover)"
        ],
        listeners: {
            "tap": "_tap"
        }
    })
    export class Popup extends PopupCore {
        private _tapHandler: EventListener;
        private _enterHandler: EventListener;
        private _leaveHandler: EventListener;
        private _header: HTMLElement;
        autoSizeContent: boolean;
        openOnHover: boolean;

        popup(): Promise<any> {
            return super.popup(this._header);
        }

        protected _open(target: HTMLElement | WebComponent) {
            super._open(target, this.$["content"]);

            var rootSizeTracker = <WebComponents.SizeTracker><any>this.$["toggleSizeTracker"];
            rootSizeTracker.measure();
        }

        private _hookTapAndHoverEvents() {
            this._header = <HTMLElement>Polymer.dom(this.root).querySelector("[toggle]") || this.parentElement;

            if (this._header == this.parentElement)
                (<any>this._header).popup = this;

            if (this.isAttached) {
                if (this.openOnHover) {
                    this._header.addEventListener("mouseenter", this._enterHandler = this._onOpen.bind(this))
                    this.addEventListener("mouseleave", this._leaveHandler = this.close.bind(this));
                }
                else
                    this._header.addEventListener("tap", this._tapHandler = this._tap.bind(this));
            }
            else {
                if (this._enterHandler) {
                    this._header.removeEventListener("mouseenter", this._enterHandler);
                    this._enterHandler = undefined;
                }

                if (this._leaveHandler) {
                    this.removeEventListener("mouseleave", this._leaveHandler);
                    this._leaveHandler = undefined;
                }

                if (this._tapHandler) {
                    this._header.removeEventListener("tap", this._tapHandler);
                    this._tapHandler = undefined;
                }
            }
        }

        private _tap(e: CustomEvent) {
            if (this.disabled)
                return;

            if (this.open) {
                if (!this.sticky)
                    this.close();

                return;
            }

            var el = <HTMLElement>e.target;
            do {
                if (el == this._header) {
                    this._onOpen(e);

                    e.stopPropagation();
                    break;
                }

                el = el.parentElement;
            }
            while (el && el != this);
        }

        private _onOpen(e: Event) {
            if (!this.open)
                this._open(this._header);

            e.stopPropagation();
            e.preventDefault();
        }

        protected _contentMouseLeave(e: MouseEvent) {
            if (this.openOnHover)
                return;

            super._contentMouseLeave(e);
        }

        private _toggleSizeChanged(e: Event, detail: { width: number; height: number }) {
            if (!this.autoSizeContent) {
                if (this._currentOrientation == "vertical") {
                    let minWidth = detail.width;
                    if (this.boundingTarget) {
                        const maxWidth = this._getTargetRect(this.boundingTarget).targetRect.width;
                        this.$["content"].style.maxWidth = maxWidth + "px";

                        if (minWidth > maxWidth)
                            minWidth = maxWidth;
                    }

                    this.$["content"].style.minWidth = minWidth + "px";
                }
                else
                    this.$["content"].style.minHeight = detail.height + "px";
            }
            else {
                if (this._currentOrientation == "vertical") {
                    if (this.boundingTarget)
                        this.$["content"].style.maxWidth = this._getTargetRect(this.boundingTarget).targetRect.width + "px";

                    this.$["content"].style.width = detail.width + "px";
                }
                else
                    this.$["content"].style.height = detail.height + "px";
            }

            e.stopPropagation();
        }
    }
}
