import {Component} from "@cldn/components";
import Button from "./Button.ts";
import Main from "./Main.ts";
import Modal from "./Modal.ts";

export default class OpenFromUrlModal extends Modal<HTMLFormElement> {
    private readonly submit = new Button("Open", Button.Style.PRIMARY).set("type", "submit")
        .class("relative");
    private readonly input = new Component<HTMLInputElement>("input")
        .class("block", "w-full", "rounded-lg", "bg-white", "px-3", "py-1.5", "mt-3", "text-base/6", "text-neutral-900", "shadow-sm", "outline-1", "-outline-offset-1", "outline-neutral-300", "placeholder:text-neutral-500", "focus:outline-2", "focus:-outline-offset-2", "focus:outline-blue-600", "sm:text-sm/6", "dark:bg-neutral-800", "dark:outline-white/10", "dark:text-white", "dark:placeholder:text-neutral-500", "dark:focus:outline-blue-500", "invalid:outline-red-500")
        .set("placeholder", "https://")
        .set("name", "url")
        .set("id", `url-${this.id}`)
        .attr("aria-labelledby", `url-label-${this.id}`)
        .set("autofocus", true)
        .set("required", true)
        .set("type", "url")
        .on("input", () => this.notError());
    private readonly errorComponent = new Component("p").class("mt-3", "text-pretty", "text-base/6", "text-red-600", "sm:text-sm/6", "dark:text-red-400", "hidden");
    public constructor() {
        super(true);
        this.body
            .append(
                this.title.text("Open from URL"),
                new Component("p").text("Enter the URL of the markdown document to view.")
                    .class("mt-2", "text-pretty", "text-base/6", "text-neutral-500", "sm:text-sm/6", "dark:text-neutral-400"),
                new Component("div").class("mt-6")
                    .append(
                        new Component<HTMLLabelElement>("label")
                            .text("URL")
                            .set("htmlFor", `url-${this.id}`)
                            .set("id", `url-label-${this.id}`)
                            .class("text-base/6", "font-medium", "text-neutral-900", "select-none", "sm:text-sm/6", "dark:text-white"),
                        this.input,
                        this.errorComponent
                    )
            )
            .after(this.footer.append(
                this.submit,
                new Button("Cancel", Button.Style.SECONDARY).on("click", () => this.hide()),
            ));
        this.panel.on("submit", async e => {
            e.preventDefault();
            this.loading();
            try {
                await this.onSubmit(new FormData(this.panel.node));
            }
            catch (e) {
                globalThis.console.error(e);
                if (e instanceof Error) this.error(e.message);
                else this.error(String(e));
            }
            this.notLoading();
        });
    }

    private async onSubmit(form: FormData) {
        const value = form.get("url");
        if (typeof value !== "string") throw new TypeError("Expected URL to be a string");
        const url = new URL(value);
        if (url.protocol !== "https:") throw new Error(`Unsupported protocol ‘${url.protocol.slice(0, -1)}’; only ‘https’ is allowed.`);
        const res = await fetch(url, {
            mode: "cors",
            redirect: "follow",
        });
        if (!res.ok)
            throw new Error(`Failed to fetch document; server returned ${res.statusText !== "" ? `${res.statusText} (${res.status})` : res.status}.`);
        const blob = await res.blob();
        const type = blob.type.split(";")[0]!;
        if (type === "text/html" || !type.startsWith("text/"))
            throw new Error(`The requested ${type} cannot be rendered.`);
        await Main.getInstance().open(new File([blob], url.pathname.split("/").slice(-1)[0]!, {type: "text/markdown"}));
    }

    private loading() {
        this.submit
            .set("disabled", true)
            .class("text-white/0")
            .append(new Component("div")
                .set("ariaHidden", "true")
                .class("size-5", "animate-spin", "border-2", "border-white/50", "border-r-white", "rounded-full", "absolute", "left-1/2", "-ml-2.5")
            );
    }

    private notLoading() {
        this.submit
            .set("disabled", false)
            .removeClass("text-white/0")
            .select("& > div:last-child")
            ?.remove();
    }

    private error(message: string) {
        this.errorComponent.text(message)
            .removeClass("hidden");
        this.submit.get("dataset").wasDisabled = this.submit.get("disabled").toString();
        this.submit.set("disabled", true);
        this.input.node.setCustomValidity(message);
        this.input.node.focus();
    }

    private notError() {
        if (this.errorComponent.hasClass("hidden")) return;
        this.errorComponent.class("hidden");
        if (this.submit.get("dataset").wasDisabled === "true") {
            this.submit.set("disabled", false);
            delete this.submit.get("dataset").wasDisabled;
        }
        this.input.node.setCustomValidity("");
    }
}
