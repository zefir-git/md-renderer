export default class KeyboardShortcut {
    private readonly keys: Set<string>;
    public constructor(keys: string, private readonly callback: (event: KeyboardEvent) => void) {
        this.keys = new Set(keys.toLowerCase().split("+").map(k => k.trim()));

        globalThis.addEventListener("keydown", event => {
            if (KeyboardShortcut.isCombination(event, this.keys)) {
                event.preventDefault();
                event.stopPropagation();
                this.callback(event);
            }
        });
    }

    private static isCombination(event: KeyboardEvent, keys: Set<string>) {
        const pressedKeys = new Set<string>();

        if (event.ctrlKey) pressedKeys.add("ctrl");
        if (event.altKey) pressedKeys.add("alt");
        if (event.metaKey) pressedKeys.add("meta");
        if (event.shiftKey) pressedKeys.add("shift");

        if (event.key in KeyboardShortcut.metaKeys)
            pressedKeys.add(KeyboardShortcut.metaKeys[event.key as keyof typeof KeyboardShortcut.metaKeys]);
        if (!/^[ -~]$/u.test(event.key))
            pressedKeys.add(KeyboardShortcut.qwerty[event.code as keyof typeof KeyboardShortcut.qwerty]);
        else pressedKeys.add(event.key.toLowerCase());
        return keys.isSubsetOf(pressedKeys);
    }

    private static readonly metaKeys = {
        "Control": "ctrl",
        "Alt": "alt",
        "Meta": "meta",
        "Shift": "shift",
    };

    private static readonly qwerty = {
        KeyA: "a",
        KeyB: "b",
        KeyC: "c",
        KeyD: "d",
        KeyE: "e",
        KeyF: "f",
        KeyG: "g",
        KeyH: "h",
        KeyI: "i",
        KeyJ: "j",
        KeyK: "k",
        KeyL: "l",
        KeyM: "m",
        KeyN: "n",
        KeyO: "o",
        KeyP: "p",
        KeyQ: "q",
        KeyR: "r",
        KeyS: "s",
        KeyT: "t",
        KeyU: "u",
        KeyV: "v",
        KeyW: "w",
        KeyX: "x",
        KeyY: "y",
        KeyZ: "z",
    }
}
