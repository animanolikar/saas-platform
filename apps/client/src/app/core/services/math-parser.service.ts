
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class MathParserService {

    constructor() { }

    /**
     * Parses "Smart Syntax" into LaTeX.
     * Example: "int(0, 1, x^2)" -> "\int_{0}^{1} x^2 \, dx"
     */
    parse(input: string): string {
        if (!input) return '';
        let latex = input;

        // 1. Basic Functions
        latex = latex.replace(/sqrt\((.*?)\)/g, '\\sqrt{$1}');
        latex = latex.replace(/frac\((.*?),(.*?)\)/g, '\\frac{$1}{$2}');

        // 2. Calculus
        // int(lower, upper, integrand) -> \int_{lower}^{upper} integrand \, dx
        latex = latex.replace(/int\((.*?),\s*(.*?),\s*(.*?)\)/g, '\\int_{$1}^{$2} $3 \\, dx');

        // sum(iterator, start, end, term) -> \sum_{iterator=start}^{end} term
        latex = latex.replace(/sum\((.*?),\s*(.*?),\s*(.*?),\s*(.*?)\)/g, '\\sum_{$1=$2}^{$3} $4');

        // lim(var, to, msg) -> \lim_{var \to to} msg
        latex = latex.replace(/lim\((.*?),\s*(.*?),\s*(.*?)\)/g, '\\lim_{$1 \\to $2} $3');

        // 3. Greek Letters (Shortcuts)
        // alpha -> \alpha, but avoid matching inside words
        const greek = ['alpha', 'beta', 'gamma', 'delta', 'theta', 'pi', 'sigma', 'omega', 'infinity', 'inf'];
        greek.forEach(g => {
            const replacement = g === 'inf' || g === 'infinity' ? '\\infty' : '\\' + g;
            // Match whole word only 
            const regex = new RegExp(`\\b${g}\\b`, 'g');
            latex = latex.replace(regex, replacement);
        });

        // 4. Operators
        latex = latex.replace(/!=/g, '\\neq');
        latex = latex.replace(/>=/g, '\\geq');
        latex = latex.replace(/<=/g, '\\leq');

        return latex;
    }
}
