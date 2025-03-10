import {Component, TextComponent} from "@cldn/components";
import Lucide from "./lucide";

class Menu extends Component {
    private readonly topMenu = new Component<HTMLMenuElement>("menu")
        .class("flex", "whitespace-nowrap")
        .set("role", "menu")
        .set("ariaOrientation", "horizontal");

    private readonly buttons: Menu.TopButton[];

    readonly #items: Map<string, Menu.MenuItem<boolean>> = new Map<string, Menu.MenuItem<boolean>>;
    public item(id: string): Menu.MenuItem<boolean> {
        const item = this.#items.get(id);
        if (item === undefined) throw new Error(`Item ${id} not found`);
        return item;
    }

    public constructor(...buttons: [Menu.BrandButton, ...Menu.TopButton[]]) {
        super("div");
        this.buttons = buttons;
        this.class("flex", "justify-between", "border-b", "border-neutral-200", "px-2", "py-1", "lg:px-4",
            "dark:border-neutral-800", "print:hidden")
            .append(this.topMenu);
        for (const button of buttons) {
            this.topMenu.append(new Component("li")
                .class("group", "relative")
                .set("role", "none")
                .append(button
                    .on("mouseover", () => {
                        if (!this.buttons.some(b => b.isOpen())) return;
                        this.closeAll();
                        button.open();
                    })));
            button.menu.items(true).forEach(item => {
                this.#items.set(item.id, item);
                if (item.isCheckbox()) item.select("input")!.on("change", () => {
                    this.executeCommand(item.id);
                    button.menu.close();
                })
                else item.on("click", () => {
                    this.executeCommand(item.id);
                    button.menu.close();
                });
            });
        }
        this.on("keydown", e => {
            if (e.key === "ArrowRight") {
                e.stopPropagation();
                e.preventDefault();
                const focusIndex = this.focusedButtonIndex();
                if (focusIndex === -1) this.activateButton(this.buttons[0]!); else this.activateButton(
                    this.buttons[focusIndex + 1] ?? this.buttons[0]!);
            }
            else if (e.key === "ArrowLeft") {
                e.stopPropagation();
                e.preventDefault();
                const focusIndex = this.focusedButtonIndex();
                if (focusIndex === -1) this.activateButton(this.buttons[0]!); else this.activateButton(
                    this.buttons[focusIndex - 1] ?? this.buttons[this.buttons.length - 1]!);
            }
        });
    }

    public executeCommand(command: string) {
        const item = this.item(command);
        if (item.isDisabled()) return;
        this.node.dispatchEvent(item.commandEvent());
    }

    public closeAll() {
        for (const button of this.buttons) button.close();
    }

    private activateButton(button: Menu.TopButton) {
        if (this.buttons.some(b => b.isOpen())) button.open(); else button.node.focus();
    }

    private focusedButtonIndex() {
        return this.buttons.findIndex(b => b.node.parentElement!.matches(":focus-within"));
    }

    public command(command: string, listener: (detail: {command: string, state: boolean, item: Menu.MenuItem<any>}) => void) {
        this.node.addEventListener("menu:command" as any, (e: CustomEvent) => {
            if (e.detail.command === command) listener(e.detail)
        });
        return this;
    }
}

namespace Menu {
    export class TopButton extends Component<HTMLButtonElement> {
        public constructor(text: string, public readonly menu: SubMenu) {
            super("button");
            this.class("rounded-sm", "px-3", "py-1", "text-sm", "font-medium", "text-neutral-900", "outline-none",
                "select-none", "peer-focus:bg-neutral-100", "focus:bg-neutral-100", "focus-visible:bg-neutral-100",
                "dark:text-neutral-100", "dark:group-focus-within:bg-neutral-800", "dark:focus:bg-neutral-800",
                "dark:focus-visible:bg-neutral-800")
                .set("role", "menuitem")
                .set("type", "button")
                .text(text);

            this.on("click", () => {
                if (this.isOpen()) this.close();
                else this.open();
            });
            this.menu.on("blur", () => this.handleBlur())
                .on("keydown", e => e.key === "Escape" && this.close());

            for (const item of this.menu.items(true)) item
                //.on("click", () => this.close())
                .onBlur(() => this.handleBlur())
                .on("mousemove", () => item.focus())
                .on("mouseleave", () => this.menu.node.focus());
        }

        public open() {
            this.before(this.menu);
            this.menu.open();
            return this;
        }

        public close(focus = true) {
            this.menu.close()
                .remove();
            if (focus) this.node.focus();
            return this;
        }

        public isOpen(): boolean {
            return this.menu.isOpen();
        }

        private handleBlur() {
            if (!this.isOpen()) return;
            globalThis.setTimeout(() => {
                const focused = globalThis.document.activeElement;
                if (this.menu.node.contains(focused)) return;
                if (focused !== this.node) this.close(false);
            }, 10);
        }
    }

    export class BrandButton extends TopButton {
        public constructor(text: string, menu: SubMenu) {
            super(text, menu);
            this.removeClass("font-medium")
                .class("font-bold");
        }
    }

    export class MenuItem<T extends true | false> extends Component<T extends true
        ? HTMLLabelElement
        : HTMLButtonElement> {
        public readonly label: string;
        readonly #checkbox: T;
        #disabled: boolean = false;

        public constructor(public readonly id: string, label: string, shortcut?: string, ...args: T extends true ? [checkbox: true] : []) {
            const checkbox = args[0] ?? false;
            super(!checkbox ? "button" as any : "label");
            this.#checkbox = checkbox as T;
            this.label = label;
            this.class("flex", "items-center", "justify-between", "rounded-sm", "px-2", "py-1.5", "text-sm",
                "text-neutral-900", "outline-none", "select-none", "focus-within:bg-neutral-100",
                "disabled:pointer-events-none", "disabled:opacity-50", "has-disabled:pointer-events-none",
                "has-disabled:opacity-50", "dark:text-neutral-100", "dark:focus-within:bg-neutral-800");
            if (this.isNotCheckbox()) this.text(label)
                .context(i => shortcut !== undefined && i.append(new Component("span")
                    .class("ml-2", "text-xs", "text-neutral-500", "dark:text-neutral-400")
                    .text(shortcut)))
                .set("tabIndex" as any, -1)
            else this.append(new Component("div")
                .class("flex", "items-center", "gap-2")
                .append(new Component<HTMLInputElement>("input")
                    .class("peer", "sr-only")
                    .set("type", "checkbox")
                    .set("name", this.id))
                .append(new Lucide.Check()
                    .class("invisible", "size-4", "peer-checked:visible")
                    .set("ariaHidden", "true"))
                .append(new TextComponent(label)));
        }

        public isNotCheckbox(): this is MenuItem<false> {
            return !this.#checkbox;
        }

        public isCheckbox(): this is MenuItem<true> {
            return this.#checkbox;
        }

        public disable(disabled: boolean = true) {
            this.#disabled = disabled;
            if (this.isNotCheckbox()) this.set("disabled", disabled); else this.select<HTMLInputElement>("input")!.set(
                "disabled", disabled);
            return this;
        }

        public isDisabled(): boolean {
            return this.#disabled;
        }

        public checked(checked: boolean = true) {
            if (this.isNotCheckbox()) throw new Error("MenuItem is not a checkbox");
            this.select<HTMLInputElement>("input")!.set("checked", checked);
            return this;
        }

        public isChecked(): boolean {
            if (this.isNotCheckbox()) throw new Error("MenuItem is not a checkbox");
            return this.select<HTMLInputElement>("input")!.get("checked");
        }

        public focus() {
            if (this.isNotCheckbox()) this.node.focus(); else this.select<HTMLInputElement>("input")!.node.focus();
            return this;
        }

        public click() {
            if (this.isNotCheckbox()) this.node.click();
            else this.select<HTMLInputElement>("input")!.node.click();
            return this;
        }

        public onBlur(listener: (ev: FocusEvent,
            component: Component<T extends true ? HTMLLabelElement : HTMLButtonElement>) => void) {
            if (this.isNotCheckbox()) this.on("blur", listener);
            else this.select<HTMLInputElement>("input")!.on("blur",
                listener as any);
            return this;
        }

        public commandEvent(): CustomEvent<{command: string, state: boolean, item: MenuItem<any>}> {
            return new CustomEvent("menu:command", {
                detail: {
                    command: this.id,
                    state: this.isCheckbox() ? this.isChecked() : true,
                    item: this
                }
            });
        }
    }

    export class MenuGroup extends Component {
        public readonly items: Menu.MenuItem<boolean>[];

        public constructor(...items: Menu.MenuItem<boolean>[]) {
            super("li");
            this.items = items;
            this.class("flex", "flex-col", "p-1")
                .set("role", "none");
            const container = items.some(i => !i.isNotCheckbox()) ? new Component("form")
                .context(f => this.append(f)) : this;
            container.append(...items);
        }
    }

    export class SubMenu extends Component<HTMLMenuElement> {
        public readonly groups: MenuGroup[];
        private readonly search: SubMenuSearch;
        #open = false;

        public constructor(...groups: MenuGroup[]) {
            super("menu");
            this.groups = groups;
            this.search = new SubMenuSearch(this, 2000);
            this.class("peer", "absolute", "top-full", "left-0", "z-50", "mt-2", "hidden", "min-w-48",
                "origin-top-left", "divide-y", "divide-neutral-200", "rounded-md", "border", "border-neutral-200",
                "bg-white", "shadow-lg", "outline-none", "dark:divide-neutral-800", "dark:border-neutral-800",
                "dark:bg-neutral-950", "dark:shadow-none")
                .set("role", "menu")
                .set("ariaOrientation", "vertical")
                .set("tabIndex", -1)
                .append(...groups)
                .on("keydown", e => {
                    const focusedItem = this._focusedItem();
                    switch (e.key) {
                        case "Tab": {
                            e.preventDefault();
                            e.stopPropagation();
                            break;
                        }
                        case "ArrowDown": {
                            e.stopPropagation();
                            e.preventDefault();
                            if (focusedItem === null) this.firstItem()?.focus(); else (this.items()[focusedItem[0] + 1] ?? this.firstItem())?.node.focus();
                            break;
                        }
                        case "ArrowUp": {
                            e.stopPropagation();
                            e.preventDefault();
                            if (focusedItem === null) this.lastItem()?.focus(); else (this.items()[focusedItem[0] - 1] ?? this.lastItem())?.node.focus();
                            break;
                        }
                        case "Home":
                        case "PageUp": {
                            e.stopPropagation();
                            e.preventDefault();
                            this.firstItem()?.focus();
                            break;
                        }
                        case "End":
                        case "PageDown": {
                            e.stopPropagation();
                            e.preventDefault();
                            this.lastItem()?.focus();
                            break;
                        }
                        default:
                            this.search.handleKey(e);
                    }
                });
        }

        public _focusedItem() {
            return this.itemEntries()
                .find(([, i]) => i.node === globalThis.document.activeElement) ?? null;
        }

        public items(disabled = false) {
            const items = this.groups.flatMap(g => g.items);
            if (!disabled) return items.filter(i => !i.isDisabled());
            return items;
        }

        public itemEntries(disabled = false) {
            return Object.entries(this.items(disabled))
                .map(([k, v]) => [Number.parseInt(k), v] as const);
        }

        public open() {
            if (this.#open) return this;
            this.#open = true;
            this.class("transition", "ease-out", "duration-100", "transform", "opacity-0", "scale-95")
                .removeClass("hidden");
            this.get("offsetHeight");
            this
                .class("opacity-100", "scale-100")
                .removeClass("opacity-0", "scale-95")
                .node.focus();
            return this;
        }

        public close() {
            if (!this.#open) return this;
            this.#open = false;
            this.class("hidden")
                .removeClass("transition", "ease-out", "duration-100", "transform", "opacity-100", "scale-100");
            return this;
        }

        public isOpen(): boolean {
            return this.#open;
        }

        private firstItem(disabled = false) {
            return this.items(disabled)[0];
        }

        private lastItem(disabled = false) {
            return this.items(disabled).slice(-1)[0];
        }
    }

    export class SubMenuSearch {
        private sequence: string[] = [];
        private lastTime: number = Date.now();

        public constructor(private readonly menu: SubMenu, private readonly time: number) {

        }

        private static normalise(string: string): string {
            return string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        public handleKey(e: KeyboardEvent) {
            const char = e.key.toLowerCase();
            if (!/^[\s\p{L}\p{N}]$/u.test(char)) return;
            e.stopPropagation();
            e.preventDefault();
            const now = Date.now();
            if (now - this.lastTime > this.time) this.clear();
            this.lastTime = now;
            this.sequence.push(char);
            let item = this.find(this.sequence.join(""));
            if (item === null) {
                this.clear();
                this.sequence.push(char);
                item = this.find(char, true);
            }
            if (item === null) return this.clear();
            item.focus();
        }

        public clear() {
            this.sequence = [];
        }

        private find(search: string, next = false): Menu.MenuItem<boolean> | null {
            const matches = this.menu.itemEntries().filter(
                ([, i]) => SubMenuSearch.normalise(i.label.toLowerCase()).startsWith(search.toLowerCase()));
            if (matches.length === 0) return null;
            const focusedIndex = this.menu._focusedItem()?.[0] ?? -1;
            return (matches.find(([index]) => next ? index > focusedIndex : index >= focusedIndex) ?? matches[0]!)[1];
        }
    }

    export class CommandEvent extends CustomEvent<{command: string, state: boolean, item: Menu.MenuItem<any>}> {
        public constructor(item: Menu.MenuItem<boolean>) {
            super(item.id, {
                detail: {
                    command: item.id,
                    state: item.isCheckbox() ? item.isChecked() : true,
                    item
                }
            });
        }
    }
}

export default Menu;
