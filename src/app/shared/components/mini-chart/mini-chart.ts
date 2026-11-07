import { Component, computed, input } from '@angular/core';

interface Tick { text: string; y: number; }
interface Point { cx: number; x: number; y: number; width: number; height: number; label: string; value: string; }

const WIDTH = 600;
const HEIGHT = 300;
const PAD_LEFT = 46;
const PAD_RIGHT = 16;
const PAD_TOP = 36;
const PAD_BOTTOM = 62;

// Redondea el máximo hacia arriba a un valor "bonito" para la escala del eje Y
function niceMax(max: number): number {

  if (max <= 0) {
    return 1;
  }

  const base = Math.pow(10, Math.floor(Math.log10(max)));
  const factor = max / base;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

  return (steps.find(step => factor <= step) ?? 10) * base;
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

// Gráfico de barras / línea en SVG puro (reemplaza a Chart.js, sin dependencias)
@Component({
  selector: 'app-mini-chart',
  templateUrl: './mini-chart.html'
})
export class MiniChart {

  readonly type = input<'bar' | 'line'>('bar');
  readonly labels = input<string[]>([]);
  readonly values = input<number[]>([]);
  readonly legend = input('');

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly padLeft = PAD_LEFT;
  readonly padRight = PAD_RIGHT;
  readonly labelY = HEIGHT - PAD_BOTTOM + 18;

  readonly model = computed(() => {

    const values = this.values();
    const labels = this.labels();
    const count = values.length;

    const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const max = niceMax(Math.max(0, ...values));

    const ticks: Tick[] = [0, 1, 2, 3, 4, 5].map(i => ({
      text: format((max * i) / 5),
      y: PAD_TOP + plotH - (plotH * i) / 5
    }));

    const band = count > 0 ? plotW / count : plotW;
    const barWidth = Math.min(band * 0.6, 64);

    const points: Point[] = values.map((value, i) => {
      const height = (value / max) * plotH;
      const cx = PAD_LEFT + band * i + band / 2;

      const rawLabel = labels[i] ?? '';

      return {
        cx,
        x: cx - barWidth / 2,
        y: PAD_TOP + plotH - height,
        width: barWidth,
        height,
        label: rawLabel.length > 14 ? rawLabel.slice(0, 13) + '…' : rawLabel,
        value: format(value)
      };
    });

    return {
      ticks,
      points,
      polyline: points.map(p => `${p.cx},${p.y}`).join(' '),
      rotate: count > 5
    };
  });
}
