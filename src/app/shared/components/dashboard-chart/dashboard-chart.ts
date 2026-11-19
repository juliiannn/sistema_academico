import { Component, computed, input } from '@angular/core';
import { DashboardChart } from '../../../core/models/statistics.model';

// ---------- Modelos de lo que se dibuja (SVG) ----------

/** Línea de referencia del eje de valores. */
interface AxisTick {
  pos: number;      // coordenada (y en barras verticales y línea, x en barras horizontales)
  text: string;
}

/** Una barra (vertical u horizontal). */
interface BarMark {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  label: string;        // etiqueta (recortada si es larga)
  fullLabel: string;    // etiqueta completa (tooltip)
  value: string;
  labelX: number;
  labelY: number;
  valueX: number;
  valueY: number;
}

/** Un punto de la línea. */
interface LinePoint {
  x: number;
  y: number;
  label: string;
  value: string;
}

/** Una porción del anillo. */
interface DonutSlice {
  path: string;
  color: string;
  label: string;
  value: string;
  percent: string;
}

/** Área de dibujo dentro del SVG (sin los márgenes de etiquetas). */
interface PlotArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Todo lo que necesita la plantilla para dibujar el gráfico. */
interface ChartView {
  width: number;
  height: number;
  empty: boolean;
  ticks: AxisTick[];
  bars: BarMark[];
  points: LinePoint[];
  linePath: string;
  slices: DonutSlice[];
  total: string;
  plot: PlotArea;
}

// Paleta categórica (se distingue bien entre sí y sobre fondo blanco)
export const CHART_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#475569'];

const W = 340;
const fmt = (n: number, unit = '') => (Number.isInteger(n) ? String(n) : n.toFixed(1)) + unit;
const cut = (text: string, max: number) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

/** Máximo "redondo" para la escala (si el gráfico no trae uno fijo). */
function niceMax(max: number): number {
  if (max <= 0) {
    return 1;
  }
  const base = Math.pow(10, Math.floor(Math.log10(max)));
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (steps.find(step => max / base <= step) ?? 10) * base;
}

/** Arco de anillo entre dos ángulos (radianes, 0 = arriba, sentido horario). */
function arc(cx: number, cy: number, r: number, inner: number, start: number, end: number): string {
  const p = (radius: number, a: number) => `${cx + radius * Math.sin(a)} ${cy - radius * Math.cos(a)}`;
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${p(r, start)} A ${r} ${r} 0 ${large} 1 ${p(r, end)} L ${p(inner, end)} A ${inner} ${inner} 0 ${large} 0 ${p(inner, start)} Z`;
}

// Gráfico del tablero en SVG puro (sin librerías): barras, barras horizontales, línea y anillo.
// Recibe la interfaz DashboardChart; al pasar el mouse cada elemento muestra su valor exacto.
@Component({
  selector: 'app-dashboard-chart',
  templateUrl: './dashboard-chart.html',
  styleUrl: './dashboard-chart.css'
})
export class DashboardChartView {

  readonly chart = input.required<DashboardChart>();

  readonly view = computed<ChartView>(() => {
    const c = this.chart();
    const { labels, values } = c.data;
    const colors = c.data.colors ?? [];
    const unit = c.unit ?? '';
    const empty = values.length === 0 || values.every(v => !v);
    const base: ChartView = {
      width: W, height: 240, empty, ticks: [], bars: [], points: [], linePath: '', slices: [], total: '',
      plot: { left: 0, right: 0, top: 0, bottom: 0 }
    };
    if (empty) {
      return base;
    }

    // ----- Anillo -----
    if (c.type === 'donut') {
      const total = values.reduce((a, b) => a + b, 0);
      let angle = 0;
      const slices = values.map<DonutSlice>((v, i) => {
        const share = v / total;
        // una sola porción del 100 %: se dibuja casi completa para que el arco exista
        const end = angle + Math.min(share, 0.9999) * 2 * Math.PI;
        const slice: DonutSlice = {
          path: arc(110, 120, 92, 56, angle, end), color: colors[i] ?? CHART_COLORS[i % CHART_COLORS.length],
          label: labels[i], value: fmt(v, unit), percent: `${Math.round(share * 1000) / 10}%`
        };
        angle = end;
        return slice;
      });
      return { ...base, slices, total: fmt(total, unit) };
    }

    // ----- Barras horizontales (muchas categorías con nombres largos) -----
    // el nombre completo va encima de cada barra, así no se recorta
    if (c.type === 'hbar') {
      const row = 32;
      const left = 4;
      const right = W - 30;
      const top = 4;
      const height = Math.max(240, top + values.length * row + 8);
      const max = c.max ?? niceMax(Math.max(...values));
      const bars = values.map<BarMark>((v, i) => {
        const w = Math.max(2, (v / max) * (right - left));
        const y = top + i * row + 16;
        return {
          x: left, y, w, h: 11, color: colors[i] ?? CHART_COLORS[0], label: cut(labels[i], 44), fullLabel: labels[i],
          value: fmt(v, unit), labelX: left, labelY: y - 4, valueX: left + w + 5, valueY: y + 10
        };
      });
      return { ...base, height, bars, plot: { left, right, top, bottom: top + values.length * row } };
    }

    // ----- Barras verticales y línea -----
    const left = labels.length > 6 ? 52 : 30;   // espacio para las etiquetas inclinadas
    const right = W - 6;
    const top = 16;
    const bottom = 240 - (labels.length > 6 ? 70 : 30);   // con muchas etiquetas, van inclinadas
    const max = c.max ?? niceMax(Math.max(...values));
    const band = (right - left) / values.length;
    const yOf = (v: number) => bottom - (v / max) * (bottom - top);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map<AxisTick>(f => ({ pos: yOf(max * f), text: fmt(max * f) }));
    const plot = { left, right, top, bottom };

    if (c.type === 'line') {
      const points = values.map<LinePoint>((v, i) => ({
        x: left + band * i + band / 2, y: yOf(v), label: labels[i], value: fmt(v, unit)
      }));
      const linePath = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
      return { ...base, ticks, points, linePath, plot };
    }

    const barW = Math.min(band * 0.68, 46);
    const bars = values.map<BarMark>((v, i) => {
      const x = left + band * i + (band - barW) / 2;
      return {
        x, y: yOf(v), w: barW, h: bottom - yOf(v), color: colors[i] ?? CHART_COLORS[0],
        label: cut(labels[i], labels.length > 6 ? 11 : 14), fullLabel: labels[i], value: fmt(v, unit),
        labelX: x + barW / 2, labelY: bottom + 12, valueX: x + barW / 2, valueY: yOf(v) - 4
      };
    });
    return { ...base, ticks, bars, plot };
  });

  /** Etiquetas inclinadas cuando hay muchas categorías. */
  readonly tilted = computed(() => this.chart().data.labels.length > 6);
}
