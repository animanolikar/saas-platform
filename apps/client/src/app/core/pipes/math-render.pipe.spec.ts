import { MathRenderPipe } from './math-render.pipe';
import { DomSanitizer } from '@angular/platform-browser';

describe('MathRenderPipe', () => {
    let pipe: MathRenderPipe;
    let sanitizerSpy: any;

    beforeEach(() => {
        sanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);
        // Mock implementation to return the string as-is for testing
        sanitizerSpy.bypassSecurityTrustHtml.and.callFake((val: string) => val as any);
        pipe = new MathRenderPipe(sanitizerSpy);
    });

    it('create an instance', () => {
        expect(pipe).toBeTruthy();
    });

    it('should render simplest inline math with $...$', () => {
        const input = 'Value is $x^2$';
        const output = pipe.transform(input) as unknown as string; // Cast to string for testing
        expect(output).toContain('<span class="katex">');
        expect(output).toContain('x^2');
    });

    it('should render display math with $$...$$', () => {
        const input = 'Value is $$x^2$$';
        const output = pipe.transform(input) as unknown as string;
        // Currently expected to FAIL or render incorrectly
        expect(output).toContain('<span class="katex-display">');
    });

    it('should render display math with \\[...\\]', () => {
        const input = 'Value is \\[x^2\\]';
        const output = pipe.transform(input) as unknown as string;
        // Currently expected to FAIL
        expect(output).toContain('<span class="katex-display">');
    });

    it('should render inline math with \\(...\\)', () => {
        const input = 'Value is \\(x^2\\)';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex">');
    });

    it('should render derivatives (fractions)', () => {
        const input = 'Derivative is $\\frac{dy}{dx}$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex">');
        expect(output).toContain('frac-line');
    });

    it('should render limits', () => {
        const input = 'Limit is $\\lim_{x \\to 0} f(x)$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex">');
        expect(output).toContain('lim');
    });

    it('should render integrals', () => {
        const input = 'Integral is $\\int_{0}^{\\infty} x^2 dx$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex">');
        expect(output).toContain('int');
    });

    it('should render power rule integration', () => {
        const input = 'Power rule: $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex">');
        expect(output).toContain('frac-line');
        expect(output).toContain('x^{n+1}');
    });

    it('should render Riemann Integral from screenshot', () => {
        const input = 'Riemann: $$\\int_{a}^{b} f(x)dx = \\lim_{n \\to \\infty} \\sum_{i=1}^{n} f(x_i)\\Delta x$$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex-display">');
        expect(output).toContain('int');
        expect(output).toContain('lim');
        expect(output).toContain('sum');
        expect(output).toContain('infty');
    });

    it('should render matrices', () => {
        const input = 'Matrix: $$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex-display">');
        expect(output).toContain('matrix');
    });

    it('should render roots and exponents', () => {
        const input = 'Roots: $\\sqrt{x} + \\sqrt[3]{y}$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex">');
        expect(output).toContain('sqrt');
    });

    it('should render set theory and logic', () => {
        const input = 'Sets: $A \\cup B \\cap C \\in \\mathbb{R}$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex">');
        expect(output).toContain('cup');
        expect(output).toContain('cap');
    });

    it('should render trigonometry and greek letters', () => {
        const input = 'Trig: $\\sin(\\alpha) + \\cos(\\beta) = \\tan(\\theta)$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex">');
        expect(output).toContain('sin');
        expect(output).toContain('alpha');
    });

    it('should render mixed text and math from screenshot (Integral Fraction)', () => {
        const input = 'Ques. Calculate the following integrals with respect to x: $\\int (\\frac{x^{35}}{x^{36}}) dx$?';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('Ques. Calculate the following integrals with respect to x:');
        expect(output).toContain('<span class="katex">'); // Math rendered
        expect(output).toContain('int'); // Integral symbol
        expect(output).toContain('frac-line'); // Fraction
        expect(output).toContain('x^{35}'); // Numerator
        expect(output).toContain('x^{36}'); // Denominator
    });

    it('should render math containing HTML entities (e.g. &nbsp; from Quill)', () => {
        // limit with &nbsp; instead of spaces
        const input = 'Limit: $$ \\lim_{x&nbsp;\\to&nbsp;0} \\frac{e^x - 1 - x}{x^2} $$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex-display">');
        expect(output).not.toContain('&nbsp;');
    });

    it('should render math with double backslashes (escaping issue)', () => {
        const input = 'Escaped: $$ \\\\lim_{x \\\\to 0} \\\\frac{e^x - 1 - x}{x^2} $$';
        const output = pipe.transform(input) as unknown as string;
        expect(output).toContain('<span class="katex-display">');
        expect(output).toContain('lim');
    });

    it('should render logs, greek letters, and calculus symbols', () => {
        const input = 'Math: $$ 2 \\ln 2 - 1 $$ and $\\alpha, \\beta, \\theta$ and derivatives $\\frac{d}{dx}$ and integrals $\\int$';
        const output = pipe.transform(input) as unknown as string;

        // Logs
        expect(output).toContain('ln');

        // Greek letters
        expect(output).toContain('alpha');
        expect(output).toContain('beta');
        expect(output).toContain('theta');

        // Calculus
        expect(output).toContain('frac-line'); // Derivative fraction
        expect(output).toContain('int'); // Integral
    });
});
