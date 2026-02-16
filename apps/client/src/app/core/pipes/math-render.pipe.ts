import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as katex from 'katex';

@Pipe({
    name: 'mathRender',
    standalone: true,
    pure: true
})
export class MathRenderPipe implements PipeTransform {

    constructor(private sanitizer: DomSanitizer) { }

    transform(value: string | null | undefined): SafeHtml {
        if (!value) return '';

        let content = value;

        // 🔹 1. Clean common editor issues
        content = content
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // 🔹 2. Fix double escaping from JSON (\\\\ → \\)
        content = content.replace(/\\\\/g, '\\');

        // 🔹 3. Render Display Math $$...$$ (supports multiline)
        content = content.replace(/\$\$(.*?)\$\$/gs, (_, tex) =>
            this.render(tex, true)
        );

        // 🔹 4. Render \[ ... \] (Display mode)
        content = content.replace(/\\\[(.*?)\\\]/gs, (_, tex) =>
            this.render(tex, true)
        );

        // 🔹 5. Render Inline Math \( ... \)
        content = content.replace(/\\\((.*?)\\\)/gs, (_, tex) =>
            this.render(tex, false)
        );

        // 🔹 6. Render Inline Math $...$
        content = content.replace(/\$(.*?)\$/g, (_, tex) =>
            this.render(tex, false)
        );

        return this.sanitizer.bypassSecurityTrustHtml(content);
    }

    private render(tex: string, displayMode: boolean): string {
        try {
            return katex.renderToString(tex.trim(), {
                displayMode,
                throwOnError: false,
                strict: "ignore",
                output: "html"
            });
        } catch {
            return tex;
        }
    }
}
