import {SvgComponent} from "@cldn/components";

export default abstract class Icon extends SvgComponent {
    protected constructor(element: SVGSVGElement) {
        super(element);
        this.set("ariaHidden", "true");
    }
}
