import { Pipe, PipeTransform } from '@angular/core';
import katex from 'katex';

@Pipe({
    name: 'mathRender',
    standalone: true
})
export class MathRenderPipe implements PipeTransform {

    transform(value: string | undefined | null): string {
        if (!value) return '';

        // Replace $...$ with rendered KaTeX
        // Note: This regex is simple and looks for $...$ non-greedily. 
        // It doesn't handle escaped \$ or multi-line partials gracefully without more logic,
        // but suffices for standard "What is $\pi$?" inputs.
        return value.replace(/\$([^\$]+)\$/g, (match, tex) => {
            try {
                return katex.renderToString(tex, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (err) {
                return match; // return original text on error
            }
        });
    }
}
