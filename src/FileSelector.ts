import {Component} from "@cldn/components";

export default class FileSelector {
    public constructor(public readonly accept: string[] = ["*/*"]) {}

    public prompt(): Promise<File | null> {
        return new Promise((resolve) => {
            new Component<HTMLInputElement>("input")
                .set("type", "file")
                .set("accept", this.accept.join(","))
                .on("change", (_, input) => {
                    const files = input.get("files");
                    if (files === null || files.length === 0) resolve(null);
                    else resolve(files[0]!);
                })
                .node.click();
        });
    }
}
