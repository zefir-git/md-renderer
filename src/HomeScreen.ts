import {Component} from "@cldn/components";
import Lucide from "./lucide";
import Main from "./Main.ts";

export default class HomeScreen extends Component<HTMLDivElement> {
    private readonly openFile = Component.from(`<button class="mt-2 flex w-full max-w-lg justify-center rounded-lg border-2 border-dashed border-neutral-300 px-6 py-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-neutral-700 dark:focus-visible:outline-blue-500">
  <div class="text-center">
    ${new Lucide.FileText()
        .class("mx-auto", "size-12", "text-neutral-300", "dark:text-neutral-700")
        .set("ariaHidden", "true")
    }
    <div class="mt-4 flex text-sm/6 text-neutral-600 dark:text-neutral-400">
      <p class="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300">Select a file</p>
      <p class="pl-1">or drag and drop</p>
    </div>
    <p class="text-xs/5 text-neutral-600 dark:text-neutral-400"><kbd class="rounded-md bg-neutral-100 px-1 py-0.5 font-[inherit] font-medium shadow ring-1 ring-neutral-950/10 dark:bg-neutral-900 dark:ring-white/10">Ctrl+O</kbd></p>
  </div>
</button>`);

    public constructor() {
        super("div");
        this.class("size-full", "flex", "flex-col", "items-center", "justify-center")
            .append(
                this.openFile
                    .on("click", () => Main.getInstance().menu.executeCommand("file:open"))
            );
    }
}
