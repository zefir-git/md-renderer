import {Component, NodeComponent} from "@cldn/components";
import markdownit from "markdown-it";
import anchor from "markdown-it-anchor";
import deflist from "markdown-it-deflist";
import Lucide from "./lucide";

export default class Renderer {
    public static readonly MIME_TYPES = ["text/markdown", "text/x-markdown", "application/markdown"];

    private readonly article = Component.from(
        `<article class="prose dark:prose-invert prose-neutral prose-headings:break-inside-avoid prose-p:[orphans:2] prose-p:[widows:2] prose-headings:break-after-avoid prose-headings:font-medium prose-h1:text-5xl prose-h1:font-bold prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-lg prose-a:hover:no-underline prose-a:focus-visible:no-underline prose-a:focus-visible:outline-2 prose-a:focus-visible:outline-offset-1 prose-a:focus-visible:outline-blue-600 dark:prose-a:focus-visible:outline-blue-500 prose-table:my-0 prose-ol:break-before-avoid prose-ul:break-before-avoid prose-tr:border-neutral-200 dark:prose-tr:border-neutral-800 prose-th:px-4 prose-th:py-2 prose-td:p-4 prose-code:before:content-none prose-code:after:content-none prose-blockquote:not-italic prose-blockquote:font-normal prose-th:bg-neutral-100 dark:prose-th:bg-neutral-800 prose-th:font-semibold prose-kbd:bg-neutral-100 dark:prose-kbd:bg-neutral-900 prose-kbd:ring-1 prose-kbd:ring-neutral-950/10 dark:prose-kbd:ring-white/10 prose-kbd:shadow-sm dark:prose-kbd:shadow-none prose-code:font-medium prose-thead:sticky prose-thead:top-0 prose-table:relative prose-thead:z-10 prose-table:[clip-path:inset(0_round_calc(theme(borderRadius.xl)-1px))] print:prose-table:[clip-path:none] prose-img:inline max-w-full prose-a:text-blue-500 dark:prose-a:text-blue-400 prose-code:bg-neutral-200 dark:prose-code:bg-neutral-800 prose-code:py-0.5 prose-code:px-1 prose-code:rounded-sm prose-blockquote:[&>*:nth-child(2)]:mt-4"></article>`);
    private readonly tocContainer = Component.from(`<div class="hidden xl:sticky xl:top-0 xl:-mr-6 xl:block xl:h-screen xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6 print:hidden">
      <nav aria-labelledby="on-this-page-title" class="w-56">
        <h2 id="on-this-page-title" class="text-sm font-medium text-neutral-900 dark:text-white">On this page</h2>
        <slot name="toc"></slot>
      </nav>
    </div>`);
    private readonly toc = Component.from(
        `<ol role="list" class="mt-4 space-y-3 text-sm text-neutral-500 dark:text-neutral-400"></ol>`);
    private readonly main = Component.from(`<main class="relative mx-auto flex w-full max-w-7xl flex-auto justify-center sm:px-2 lg:px-8 xl:px-12 print:max-w-none print:p-0">
      <div class="max-w-2xl min-w-0 flex-auto px-4 py-16 lg:max-w-none lg:pr-0 lg:pl-8 xl:px-16 print:max-w-none print:p-0">
        <slot name="article"></slot>
      </div>
    </main>`).append(this.tocContainer);
    private readonly headings: {name: string, id: string, sub: {name: string, id: string}[]}[] = [];
    private debounceTimeout: number | null = null;

    public constructor(root: NodeComponent<any>, markdown: string) {
        this.article.slot("article", this.main.node);
        this.toc.slot("toc", this.main.node);

        const md = markdownit({
            html: true, linkify: true, typographer: false,
        })
            .use(anchor, {
                level: 2,
                tabIndex: false,
                slugify: (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, ""),
                permalink: anchor.permalink.headerLink({
                    class: "not-prose hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-500 focus-visible:underline",
                }),
            })
            .use(deflist)
            .render(markdown);
        this.article.html`${md}`;

        // handle hash changes
        globalThis.addEventListener("hashchange", e => {
            if (!this.isRendered()) return;
            e.preventDefault();
            Renderer.scrollToHash();
        });

        // print preview
        globalThis.addEventListener("beforeprint", () => {
            if (!this.isRendered()) return;
            new Component(globalThis.document.documentElement)
                .context(html => html.get("dataset").wasDark = html.hasClass("dark").toString())
                .removeClass("dark");
            for (const details of this.article.selectAll<HTMLDetailsElement>("details")) {
                details.get("dataset").wasOpen = details.get("open").toString();
                details.set("open", true);
            }
        });

        // undo print preview
        globalThis.addEventListener("afterprint", () => {
            delete new Component(globalThis.document.documentElement)
                .context(html => html.get("dataset").wasDark === "true" && html.class("dark"))
                .get("dataset").wasDark;
            for (const details of this.article.selectAll<HTMLDetailsElement>("details[data-was-open]")) {
                delete details
                    .set("open", details.get("dataset").wasOpen === "true")
                    .get("dataset").wasOpen;
            }
        });

        // wrap tables in div for rounded corners
        for (const table of this.article.selectAll("table")) {
            const wrapper = new Component("div")
                .class("rounded-xl", "border", "border-neutral-200", "my-[2em]", "dark:border-neutral-800", "dark:bg-neutral-900", "print:rounded-none");
            table.before(wrapper);
            wrapper.append(table);
        }

        // GitHub style quotes, i.e. [!NOTE], [!CAUTION], etc.
        for (const blockquote of this.article.selectAll("blockquote")
            .filter(b => /^\[![A-Z]+]\n/.test(b.get("textContent")!.trim() ?? ""))) {

            const typeName = blockquote.get("textContent")!.trim().match(/^\[!([A-Z]+)]/)![1]!;
            const type = Renderer.quoteTypes[typeName.toLowerCase()];
            if (type === undefined) continue;

            blockquote.class(type.class);

            const walker = document.createTreeWalker(
                blockquote.node,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => node.nodeValue?.trim().startsWith(`[!${typeName}]`)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP,
                }
            );

            if (walker.nextNode()) {
                const node = walker.currentNode as Text;
                node.nodeValue = node.nodeValue!.replace(new RegExp(`^\\[!${typeName}]\\s*`), "");
            }

            blockquote.prepend(new Component(type.name.node.cloneNode(true) as HTMLElement));
        }

        // Open 3rd party links in new tab
        for (const a of this.article.selectAll<HTMLAnchorElement>("a[href]"))
            if (a.get("origin") !== location.origin && (a.get("protocol") === "https:" || a.get("protocol") === "http:"))
                a.set("target", "_blank");

        // avoid page breaks in single-sentence paragraphs
        for (const p of this.article.selectAll("p")) {
            const paragraphText = p.get("textContent")!.trim();
            const sentences = paragraphText.split(/(?<=[.!?])\s+/);
            if (sentences.length === 1)
                p.class("break-inside-avoid");
        }


        // nest headings (for table of contents)
        for (const heading of this.article.selectAll<HTMLHeadingElement>("h2, h3, h4, h5, h6")) {
            if (heading.get("tagName") === "H2") {
                this.headings.push({
                    name: heading.get("textContent")!.trim(), id: heading.get("id"), sub: [],
                });
                continue;
            }
            const last = this.headings.slice(-1)[0];
            if (last === undefined) this.hideTableOfContents();
            else last.sub.push({name: heading.get("textContent")!.trim(), id: heading.get("id")});
        }

        if (this.headings.length === 0) this.hideTableOfContents();

        // render table of contents
        for (const heading of this.headings) {
            const li = new Component("li");
            li.append(new Component("h3")
                .append(new Component<HTMLAnchorElement>("a")
                    .class("font-medium", "hover:text-neutral-600", "dark:hover:text-neutral-300")
                    .set("href", `#${heading.id}`)
                    .text(heading.name)));
            if (heading.sub.length > 0) {
                const ol = new Component("ol")
                    .class("mt-2", "space-y-3", "pl-5")
                    .set("role", "list");
                for (const sub of heading.sub) {
                    ol.append(new Component("li")
                        .append(new Component<HTMLAnchorElement>("a")
                            .class("font-medium", "hover:text-neutral-600", "dark:hover:text-neutral-300")
                            .set("href", `#${sub.id}`)
                            .text(sub.name)));
                }
                li.append(ol);
            }
            this.toc.append(li);
        }

        // show active heading/section in table of contents
        const headingsList = this.article.selectAll<HTMLHeadingElement>("h2, h3, h4, h5, h6");
        const tocLinks = new Map<string, Component<HTMLAnchorElement>>();

        for (const li of this.toc.selectAll("li")) {
            const anchor = li.select<HTMLAnchorElement>("a");
            if (anchor === null) continue;
            tocLinks.set(anchor.get("hash").slice(1), anchor);
        }

        root.on("scroll", () => {
            if (this.debounceTimeout !== null) return;
            if (!this.isRendered()) return;
            this.debounceTimeout = this.updateActiveHeading(headingsList, tocLinks);
        });
        this.updateActiveHeading(headingsList, tocLinks);

        // details chevron
        for (const summary of this.article.selectAll<HTMLDetailsElement>("details > summary")) {
            summary.prepend(new Lucide.ChevronRight()
                .class("size-5", "mr-1", "opacity-50")
                .set("ariaHidden", "true")
            );
        }
    }

    private isRendered() {
        return this.article.closest("body") !== null;
    }

    private updateActiveHeading(headingsList: Component<HTMLHeadingElement>[], tocLinks: Map<string, Component<HTMLAnchorElement>>) {
        return globalThis.setTimeout(() => {
            this.debounceTimeout = null;
            let activeId: string | null = null;

            for (const heading of headingsList) {
                if (!heading.node.checkVisibility() || !(heading.node.closest("details")?.open ?? true))
                    continue;
                const rect = heading.node.getBoundingClientRect();
                if (rect.top <= rect.height)
                    activeId = heading.get("id");
                else break;
            }

            if (!activeId) return;

            for (const link of tocLinks.values())
                link.removeClass("text-blue-500", "dark:text-blue-400")
                    .class("hover:text-neutral-600", "dark:hover:text-neutral-300");

            const activeLink = tocLinks.get(activeId);
            if (activeLink === undefined) return;
            activeLink.class("text-blue-500", "dark:text-blue-400")
                .removeClass("hover:text-neutral-600", "dark:hover:text-neutral-300");

            for (const heading of this.headings) {
                if (heading.id === activeId) break;
                if (heading.sub.some(s => s.id === activeId)) {
                    tocLinks.get(heading.id)?.class("text-blue-500", "dark:text-blue-400")
                        .removeClass("hover:text-neutral-600", "dark:hover:text-neutral-300");
                    break;
                }
            }
        }, 50);
    }

    public show(parent: NodeComponent<any>) {
        parent.append(this.main);

        // set title based on h1
        const h1 = this.article.select("h1")?.get("textContent") ?? null;
        if (h1 !== null) globalThis.document.title = h1;

        // scroll to hash
        if (globalThis.location.hash !== "")
            Renderer.scrollToHash();
    }

    private static scrollToHash() {
        const element = globalThis.document.getElementById(globalThis.decodeURIComponent(globalThis.location.hash.slice(1)));
        if (element !== null) {
            new Component(element)
                .closest<HTMLDetailsElement>("details")
                ?.set("open", true);
            element.scrollIntoView();
        }
    }

    private static readonly quoteTypes: Record<string, {
        class: string, name: Component
    }> = {
        note: {
            class: "border-blue-500 dark:border-blue-400", name: new Component("div")
                .class("text-blue-500", "not-prose", "flex", "items-center", "gap-2", "dark:text-blue-400")
                .append(new Lucide.Info().class("size-5"), new Component("p")
                    .class("font-medium")
                    .text("Note")),
        }, tip: {
            class: "border-green-500 dark:border-green-400", name: new Component("div")
                .class("text-green-500", "not-prose", "flex", "items-center", "gap-2", "dark:text-green-400")
                .append(new Lucide.Lightbulb().class("size-5"), new Component("p")
                    .class("font-medium")
                    .text("Tip")),
        }, important: {
            class: "border-purple-500 dark:border-purple-400", name: new Component("div")
                .class("text-purple-500", "not-prose", "flex", "items-center", "gap-2", "dark:text-purple-400")
                .append(new Lucide.MessageSquareWarning().class("size-5"), new Component("p")
                    .class("font-medium")
                    .text("Important")),
        }, warning: {
            class: "border-orange-500 dark:border-orange-400", name: new Component("div")
                .class("text-orange-500", "not-prose", "flex", "items-center", "gap-2", "dark:text-orange-400")
                .append(new Lucide.TriangleAlert().class("size-5"), new Component("p")
                    .class("font-medium")
                    .text("Warning")),
        }, caution: {
            class: "border-red-500 dark:border-red-400", name: new Component("div")
                .class("text-red-500", "not-prose", "flex", "items-center", "gap-2", "dark:text-red-400")
                .append(new Lucide.OctagonAlert().class("size-5"), new Component("p")
                    .class("font-medium")
                    .text("Caution")),
        },
    };

    public hideTableOfContents() {
        this.tocContainer.remove();
    }

    public showTableOfContents() {
        this.main.append(this.tocContainer);
    }

    public isTableOfContentsVisible() {
        return this.tocContainer.node.parentElement !== null;
    }
}
