import {Component} from "@cldn/components";

class Button extends Component<HTMLButtonElement> {
    public constructor(text: string, style: Button.Style) {
        super("button");
        this.set("type", "button")
            .class("inline-flex", "items-center", "rounded-lg", "px-3", "py-2", "text-sm", "font-semibold", "shadow-xs", "disabled:pointer-events-none", "focus-visible:outline-2", "focus-visible:outline-offset-2", "focus-visible:outline-blue-600", "dark:shadow-none", "dark:focus-visible:outline-blue-500")
            .class(style)
            .text(text)
    }
}

namespace Button {
    export const enum Style {
        PRIMARY = "bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400",
        SECONDARY = "bg-white text-neutral-900 ring-1 ring-neutral-300 ring-inset hover:bg-neutral-50 dark:bg-neutral-900 dark:text-white dark:ring-white/5 dark:hover:bg-neutral-800",
    }
}

export default Button;
