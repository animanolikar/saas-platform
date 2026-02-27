
import { Component, ElementRef, EventEmitter, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-math-canvas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './math-canvas.component.html',
    styles: [`
    canvas {
      touch-action: none; /* Prevent scrolling on mobile */
      cursor: crosshair;
    }
  `]
})
export class MathCanvasComponent implements AfterViewInit {
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    @Output() imageExported = new EventEmitter<string>();

    private ctx!: CanvasRenderingContext2D;
    private isDrawing = false;
    private strokes: { x: number, y: number }[][] = [];

    ngAfterViewInit() {
        const canvas = this.canvasRef.nativeElement;
        this.ctx = canvas.getContext('2d')!;

        // Set canvas size (visual + internal)
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Initial white background
        this.clear();
    }

    resizeCanvas() {
        const canvas = this.canvasRef.nativeElement;
        const parent = canvas.parentElement;

        if (parent) {
            const width = parent.clientWidth || 600;
            const height = 300;

            // Handle High DPI
            const dpr = window.devicePixelRatio || 1;

            // Set actual size in memory (scaled to account for extra pixel density)
            canvas.width = width * dpr;
            canvas.height = height * dpr;

            // Set visible size
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            // Normalize coordinate system to use css pixels.
            this.ctx.scale(dpr, dpr);
        }

        // Re-apply styles after resize
        this.ctx.lineWidth = 3;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = '#000';

        // Redraw content if any
        if (this.strokes.length > 0) {
            this.redrawAll();
        }
    }

    startDrawing(e: MouseEvent | TouchEvent) {
        this.isDrawing = true;
        const { x, y } = this.getCoords(e);
        // Start new stroke
        this.strokes.push([{ x, y }]);
    }

    draw(e: MouseEvent | TouchEvent) {
        if (!this.isDrawing) return;
        e.preventDefault();

        const { x, y } = this.getCoords(e);
        const currentStroke = this.strokes[this.strokes.length - 1];
        currentStroke.push({ x, y });

        this.redrawAll();
    }

    private redrawAll() {
        // Clear canvas (use physical pixels to clear everything)
        // We can just use the scaled dimensions if we rely on fillRect, 
        // but explicit clearRect is safer for "clearing".
        // However, we want white background.

        const canvas = this.canvasRef.nativeElement;
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.ctx.restore();

        this.ctx.beginPath();

        for (const points of this.strokes) {
            if (points.length < 1) continue;

            if (points.length < 3) {
                const b = points[0];
                this.ctx.moveTo(b.x, b.y);
                this.ctx.arc(b.x, b.y, this.ctx.lineWidth / 2, 0, Math.PI * 2, !0);
                continue;
            }

            this.ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length - 2; i++) {
                const c = (points[i].x + points[i + 1].x) / 2;
                const d = (points[i].y + points[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(points[i].x, points[i].y, c, d);
            }

            // For the last 2 points
            const i = points.length - 2;
            this.ctx.quadraticCurveTo(
                points[i].x,
                points[i].y,
                points[i + 1].x,
                points[i + 1].y
            );
        }

        this.ctx.stroke();
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    clear() {
        this.strokes = [];
        const canvas = this.canvasRef.nativeElement;
        // Check if canvas exists to avoid errors during destroy/init cycles
        if (!canvas || !this.ctx) return;

        // We need to clear based on the SCALED size logic,
        // but fillRect uses current transform.
        // Since we scaled by dpr, 0,0 to width,height (CSS pixels) should cover it.
        // However, clearRect might be safer with full buffer dims if we reset transform.
        // But fillRect with white is what we want.

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to clear physical pixels
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.ctx.restore();
    }

    exportImage() {
        const canvas = this.canvasRef.nativeElement;
        const dataUrl = canvas.toDataURL('image/png');
        this.imageExported.emit(dataUrl);
    }

    private getCoords(e: MouseEvent | TouchEvent) {
        const canvas = this.canvasRef.nativeElement;
        const rect = canvas.getBoundingClientRect();

        let clientX, clientY;

        if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
}
