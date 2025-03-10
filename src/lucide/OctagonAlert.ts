import Icon from "../Icon.ts";

export default class OctagonAlert extends Icon {
    public constructor() {
        super(Icon.from(
            `<svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M12 16h.01M12 8v4M15.31 2a2 2 0 0 1 1.42.59l4.68 4.68A2 2 0 0 1 22 8.7v6.62a2 2 0 0 1-.59 1.42l-4.68 4.68a2 2 0 0 1-1.42.59H8.7a2 2 0 0 1-1.42-.59L2.6 16.73A2 2 0 0 1 2 15.3V8.7a2 2 0 0 1 .59-1.42L7.27 2.6A2 2 0 0 1 8.7 2z"/></svg>`).node);
    }
}
