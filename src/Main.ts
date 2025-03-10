import {Component} from "@cldn/components";
import FileSelector from "./FileSelector.ts";
import HomeScreen from "./HomeScreen.ts";
import KeyboardShortcut from "./KeyboardShortcut.ts";
import Menu from "./Menu.ts";
import OpenFromUrlModal from "./OpenFromUrlModal.ts";
import Renderer from "./Renderer.ts";

export default class Main {
    static #instance: Main | null = null;
    public static getInstance() {
        return this.#instance ??= new Main();
    }

    #file: Blob | null = null;

    public readonly menu = new Menu(
        new Menu.BrandButton("Renderer", new Menu.SubMenu(new Menu.MenuGroup(
            new Menu.MenuItem("main:about", "About Renderer").disable(),
            new Menu.MenuItem("main:preferences", "Preferences…", "Ctrl+,").disable(),
        ))),
        new Menu.TopButton("File", new Menu.SubMenu(
            new Menu.MenuGroup(
                new Menu.MenuItem("file:new", "New Document", "Ctrl+N").disable(),
                new Menu.MenuItem("file:close", "Close Document…", "Ctrl+Alt+W"),
            ),
            new Menu.MenuGroup(
                new Menu.MenuItem("file:open", "Open Document…", "Ctrl+O"),
                new Menu.MenuItem("file:open-url", "Open from URL…", "Ctrl+U"),
            ),
            new Menu.MenuGroup(
                new Menu.MenuItem("file:save", "Save…", "Ctrl+S"),
                new Menu.MenuItem("file:print", "Print…", "Ctrl+P"),
            ),
        )),
        new Menu.TopButton("View", new Menu.SubMenu(new Menu.MenuGroup(
            new Menu.MenuItem("view:table-of-contents", "Table of Contents", void 0, true).checked(),
        ))),
    );

    private readonly root = new Component("div")
        .class("overflow-auto", "grow")
        .set("tabIndex", -1)
        .on("dragover", e => e.preventDefault())
        .on("drop", async e => {
            e.preventDefault();
            if (e.dataTransfer === null) return;
            for (const item of e.dataTransfer.items) {
                if (item.kind !== "file") continue;
                const entry = item.webkitGetAsEntry();
                if (entry === null) continue;
                if (entry instanceof FileSystemFileEntry) {
                    if (await this.open(entry)) return;
                }
                else if (entry instanceof FileSystemDirectoryEntry)
                    if (await this.openDir(entry)) return;
            }
        });

    private readonly home = new HomeScreen();

    private renderer: Renderer | null = null;
    private openUrlModal: OpenFromUrlModal | null = null;

    private constructor() {
        new Component(document.body)
            .class("flex", "flex-col")
            .append(this.menu)
            .append(this.root);

        globalThis.addEventListener("paste", async e => {
            const clipboard = e.clipboardData;
            if (clipboard === null) return;
            for (const item of clipboard.items) {
                if (item.kind !== "file") continue;
                const entry = item.webkitGetAsEntry();
                if (entry === null) continue;
                if (entry instanceof FileSystemFileEntry) {
                    if (await this.open(entry)) return;
                }
                else if (entry instanceof FileSystemDirectoryEntry)
                    if (await this.openDir(entry)) return;
            }
        });

        this.close();

        this.menu.command("file:open", async () => await this.open(
            await new FileSelector(Renderer.MIME_TYPES).prompt())
        );
        this.menu.command("file:open-url", () => this.openUrlModal = new OpenFromUrlModal().show());
        this.menu.command("file:save", () => {
            const blob = this.#file;
            console.log("save", blob);
            if (blob === null) return;
            const url = URL.createObjectURL(blob);
            new Component<HTMLAnchorElement>("a")
                .set("href", url)
                .set("download", blob instanceof File ? blob.name : "document.md")
                .node.click();
            URL.revokeObjectURL(url);
        });
        this.menu.command("file:close", () => this.close());
        this.menu.command("file:print", async () => await this.print());
        this.menu.command("view:table-of-contents", e => {
            if (this.renderer === null) return;
            if (e.state) this.renderer.showTableOfContents();
            else this.renderer.hideTableOfContents();
        });

        new KeyboardShortcut("ctrl+o", () => this.menu.executeCommand("file:open"));
        new KeyboardShortcut("ctrl+u", () => this.menu.executeCommand("file:open-url"));
        new KeyboardShortcut("ctrl+alt+w", () => this.menu.executeCommand("file:close"));
        new KeyboardShortcut("ctrl+s", () => this.menu.executeCommand("file:save"));
        new KeyboardShortcut("ctrl+p", () => this.menu.executeCommand("file:print"));
    }

    public async open(source?: File | FileSystemFileEntry | Blob | null) {
        if (
            source === null
            || source === undefined
        ) return false;
        const file = source instanceof Blob
            ? source
            : await new Promise<File | null>(resolve => source.file(resolve));
        if (file === null || !Renderer.MIME_TYPES.includes(file.type.split(";")[0]!.trim()))
            return false;
        this.close();
        this.#file = file;
        this.openUrlModal?.hide();
        this.menu.executeCommand("file:close");
        this.renderer = new Renderer(this.root, await file.text());
        this.renderer.show(this.root.empty());
        if (!this.renderer.isTableOfContentsVisible())
            this.menu.item("view:table-of-contents").disable(true);
        else if (!this.menu.item("view:table-of-contents").isChecked())
            this.renderer.hideTableOfContents();
        this.menu.item("file:close").disable(false);
        this.menu.item("file:save").disable(false);
        this.menu.item("file:print").disable(false);
        return true;
    }

    private async openDir(dir: FileSystemDirectoryEntry) {
        const entries = await new Promise<FileSystemEntry[]>(resolve => dir.createReader().readEntries(resolve));
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name)))
            if (entry instanceof FileSystemFileEntry) {
                if (await this.open(entry)) return true;
            }
            else if (entry instanceof FileSystemDirectoryEntry)
                if (await this.openDir(entry)) return true;
        return false;
    }

    public close() {
        this.#file = null;
        this.openUrlModal?.hide();
        this.root.empty().append(this.home);
        this.menu.item("file:close").disable(true);
        this.menu.item("file:save").disable(true);
        this.menu.item("file:print").disable(true);
        this.menu.item("view:table-of-contents").disable(false);
        globalThis.document.title = "Renderer";
    }

    public async print() {
        const iframe = new Component<HTMLIFrameElement>("iframe")
            .class("hidden");
        document.body.append(iframe.node);
        const frameWin = iframe.get("contentWindow");
        const frameDoc = iframe.get("contentDocument") ?? frameWin?.document;
        if (!frameWin || !frameDoc) {
            iframe.remove();
            return false;
        }

        frameDoc.open();
        frameDoc.close();
        frameDoc.title = document.title;
        for (const stylesheet of document.styleSheets)
            if (stylesheet.ownerNode instanceof HTMLElement)
                frameDoc.head.append(frameDoc.importNode(stylesheet.ownerNode, true));
        frameDoc.body.append(frameDoc.importNode(this.root.node, true));
        iframe.node.focus();
        const result = await Promise.race([
            new Promise<boolean>(resolve => {
                frameWin?.addEventListener("load", () => {
                    frameWin?.print();
                    resolve(true);
                });
            }),
            new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000))
        ]);
        iframe.remove();
        return result;
    }
}
