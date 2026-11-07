import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { ApiService } from '../../../../core/services/api';
import { NavItem } from '../../../../core/models/nav.config';
import { PermissionsService } from '../../../../core/services/permissions';
import { formatDateTime } from '../../../../core/utils/datatable';
import { enumLabel } from '../../../../core/models/enums';
import { Row } from '../../../../core/models/row.model';
import { Alert } from '../../../../shared/components/alert/alert';
import { Card } from '../../../../shared/components/card/card';
import { DetailItem, DetailList } from '../../../../shared/components/detail-list/detail-list';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MiniChart } from '../../../../shared/components/mini-chart/mini-chart';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';

interface ChartData {
  labels: string[];
  values: number[];
}

// Equivale a assets/js/dashboard.js
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, Alert, Card, StatCard, MiniChart, DetailList, EmptyState],
  templateUrl: './dashboard-page.html'
})
export class DashboardPage implements OnInit {

  private auth = inject(AuthService);
  private api = inject(ApiService);
  private permissions = inject(PermissionsService);

  readonly role = this.auth.role;
  readonly email = this.auth.email;

  // Las estadísticas se muestran cuando el módulo Dashboard del rol tiene alcance ALL (tabla role_modules)
  readonly canSeeStats = computed(() => this.permissions.find('/dashboard')?.alcance === 'ALL');

  // Módulos del rol (de la base de datos) como accesos rápidos
  readonly features = computed<NavItem[]>(() =>
    this.permissions.navItems().filter(item => item.key !== '/dashboard')
  );

  // Últimos comunicados (los publica el rector o el administrador y los ven todos los roles)
  readonly announcements = signal<Row[]>([]);
  readonly canSeeAnnouncements = computed(() => this.permissions.can('/announcements'));

  // Datos de la cuenta con la que se inició sesión
  readonly account = computed<DetailItem[]>(() => [
    { label: 'Correo', value: this.email() },
    { label: 'Rol', value: enumLabel('role', this.role()) }
  ]);

  // Estadísticas (se piden al backend; solo ADMIN y RECTOR)
  readonly stats = signal<Row>({});
  readonly studentsByCourse = signal<ChartData>({ labels: [], values: [] });
  readonly averageGrades = signal<ChartData>({ labels: [], values: [] });
  readonly attendanceRate = signal<ChartData>({ labels: [], values: [] });
  readonly error = signal('');

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.permissions.load().catch(() => undefined);
    if (this.canSeeStats()) {
      void this.loadStats();
    }
    if (this.canSeeAnnouncements()) {
      try {
        const rows = ((await this.api.get('/announcements')).data ?? []) as Row[];
        this.announcements.set(rows.filter(r => r['estado'] !== false).slice(0, 3));
      } catch {
        this.announcements.set([]);
      }
    }
  }

  when(value: unknown): string {
    return formatDateTime(value);
  }

  private async loadStats(): Promise<void> {
    try {
      const [general, byCourse, grades, attendance] = await Promise.all([
        this.api.get('/statistics/general'),
        this.api.get('/statistics/students-by-course'),
        this.api.get('/statistics/average-grades'),
        this.api.get('/statistics/attendance-rate')
      ]);
      this.stats.set(general.data ?? {});
      this.studentsByCourse.set(this.chart(byCourse.data, 'courseName', 'studentCount'));
      this.averageGrades.set(this.chart(grades.data, 'subjectName', 'averageGrade'));
      this.attendanceRate.set(this.chart(attendance.data, 'courseName', 'attendanceRate'));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    }
  }

  stat(field: string): number {
    return Number(this.stats()[field] ?? 0);
  }

  private chart(data: unknown, labelField: string, valueField: string): ChartData {
    const rows: Row[] = Array.isArray(data) ? data : [];
    return {
      labels: rows.map(row => String(row[labelField])),
      values: rows.map(row => Number(row[valueField]))
    };
  }
}
