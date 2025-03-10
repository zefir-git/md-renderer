import {Component} from "@cldn/components";
import Lucide from "./lucide";

export default abstract class Modal<T extends HTMLDivElement | HTMLFormElement = HTMLDivElement> extends Component<HTMLDivElement> {
    protected readonly id = crypto.randomUUID();

    private readonly backdrop = new Component("div")
        .class("fixed", "inset-0", "bg-neutral-950/25", "transition-opacity", "dark:bg-neutral-950/50")
        .set("ariaHidden", "true");

    protected readonly panel: Component<T>;

    protected readonly body = new Component("div")
        .class("bg-white", "px-4", "pt-5", "pb-4", "sm:p-6", "sm:pb-4", "dark:bg-neutral-900");

    protected readonly footer = new Component("div")
        .class("bg-neutral-50", "px-4", "py-3", "sm:flex", "sm:flex-row-reverse", "sm:px-6", "sm:gap-x-3", "dark:bg-neutral-900");

    protected readonly title = new Component("h3")
        .class("text-lg/6", "font-semibold", "text-neutral-900", "sm:text-base/6", "dark:text-white")
        .set("id", `modal-title-${this.id}`);

    protected readonly dismiss = new Component<HTMLButtonElement>("button")
        .class("absolute", "top-0", "right-0", "hidden", "rounded-md", "bg-white", "pt-4", "pr-4", "text-neutral-400", "hover:text-neutral-500", "focus-visible:outline-2", "focus-visible:outline-offset-2", "focus-visible:outline-blue-500", "sm:block")
        .append(new Component("span").text("Close").class("sr-only"))
        .append(new Lucide.X().class("size-6").set("ariaHidden", "true"));

    protected constructor(...args: T extends HTMLFormElement ? [formBody: true] : [formBody?: false]) {
        const formBody = args[0] ?? false;
        super("div");
        this.panel = new Component<HTMLFormElement | HTMLDivElement>(formBody ? "form" : "div")
            .class("relative", "transform", "overflow-hidden", "rounded-2xl", "bg-white", "text-left", "shadow-xl", "outline-1", "-outline-offset-1", "outline-neutral-950/10", "transition-all", "sm:my-8", "sm:w-full", "sm:max-w-lg", "dark:bg-neutral-900", "dark:outline-white/10") as Component<T>;

        this.class("relative", "z-10")
            .attr("aria-labelledby", `modal-title-${this.id}`)
            .set("role", "dialog")
            .set("ariaModal", "true")
            .append(this.backdrop)
            .append(new Component("div")
                .class("fixed", "inset-0", "z-10", "w-screen", "overflow-y-auto")
                .on("click", (e) => !(e.target instanceof Node && this.panel.node.contains(e.target)) && this.hide())
                .append(new Component("div")
                    .class("flex", "min-h-full", "items-end", "justify-center", "p-4", "text-center", "sm:items-center", "sm:p-0")
                    .append(this.panel
                        .append(this.body)
                        .append(this.footer)
                    )
                )
            );

        this.dismiss.on("click", () => this.hide());
        this.on("keydown", e => e.key === "Escape" && this.hide());
    }

    public show() {
        new Component(globalThis.document.body).append(this);
        this.backdrop.class("ease-out", "duration-300", "opacity-0");
        this.panel.class("ease-out", "duration-300", "opacity-0", "translate-y-4", "sm:translate-y-0", "sm:scale-95");
        this.get("offsetHeight");
        this.backdrop.class("opacity-100");
        this.panel.class("opacity-100", "translate-y-0", "sm:scale-100");
        setTimeout(() => {
            this.backdrop.removeClass("ease-out", "duration-300", "opacity-0", "opacity-100");
            this.panel.removeClass("ease-out", "duration-300", "opacity-0", "translate-y-4", "sm:translate-y-0", "sm:scale-95", "opacity-100", "translate-y-0", "sm:scale-100");
        }, 300);
        this.select("[autofocus]:not([disabled])")?.node.focus();
        return this;
    }

    public hide() {
        this.backdrop.class("ease-in", "duration-200", "opacity-0");
        this.panel.class("ease-in", "duration-200", "opacity-0", "translate-y-4", "sm:translate-y-0", "sm:scale-95");
        setTimeout(() => {
            this.remove();
            this.backdrop.removeClass("ease-in", "duration-200", "opacity-0", "opacity-100");
            this.panel.removeClass("ease-in", "duration-200", "opacity-0", "translate-y-4", "sm:translate-y-0", "sm:scale-95");
        }, 200);
        return this;
    }

    private focusableElements() {
        return this.selectAll([
            "a[href]:not([disabled])",
            "button:not([disabled])",
            "input:not([type=hidden, disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "area[href]:not([disabled])",
            "[tabindex]:not([disabled])",
            "[contenteditable]:not([disabled])",
            "iframe:not([disabled])",
        ].join(", ")).filter(e => e.isVisible()
            && e.get("tabIndex") > -1
            && globalThis.getComputedStyle(e.node).pointerEvents !== "none"
        );
    }
}
