import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Option } from '../../../../core/models/crud.model';
import { Pictogram, Support } from '../../../../core/models/aux-api.model';
import { AuxApiService } from '../../../../core/services/aux-api';
import { ToastService } from '../../../../core/services/toast';
import { errorMessage } from '../../../../core/utils/format';
import { Alert } from '../../../../shared/components/alert/alert';
import { Card } from '../../../../shared/components/card/card';
import { ConnectionBanner } from '../../../../shared/components/connection-banner/connection-banner';
import { Modal } from '../../../../shared/components/modal/modal';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PictogramPicker } from '../../../../shared/components/pictogram-picker/pictogram-picker';
import { SupportCard } from '../../../../shared/components/support-card/support-card';
import { ApoyoForm } from '../../components/apoyo-form/apoyo-form';
import { MAX_STEPS, formToInput, formToPreview, newApoyoForm, newStepGroup, supportToForm } from '../../models/apoyo.model';
import { ApoyosService } from '../../services/apoyos';

// Crear / editar un apoyo visual, con buscador de pictogramas y vista previa en vivo
@Component({
  selector: 'app-apoyo-form-page',
  imports: [Card, PageHeader, Alert, ConnectionBanner, ApoyoForm, SupportCard, Modal, PictogramPicker],
  templateUrl: './apoyo-form-page.html'
})
export class ApoyoFormPage implements OnInit {

  private api = inject(AuxApiService);
  private apoyos = inject(ApoyosService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly form: FormGroup = newApoyoForm();
  readonly students = signal<Option[]>([]);
  readonly online = this.api.online;

  readonly editingId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly preview = signal<Support>(formToPreview(this.form.getRawValue()));

  // Buscador de pictogramas
  readonly pickerIndex = signal<number | null>(null);
  readonly pictos = signal<Pictogram[]>([]);
  readonly pictoLoading = signal(false);
  readonly pictoError = signal('');
  readonly pictoSearched = signal(false);

  constructor() {
    this.form.valueChanges.subscribe(() => this.preview.set(formToPreview(this.form.getRawValue())));
  }

  private get steps(): FormArray {
    return this.form.get('pasos') as FormArray;
  }

  ngOnInit(): void {
    void this.apoyos.studentOptions().then(list => this.students.set(list));
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      this.editingId.set(id);
      void this.loadForEdit(id);
    }
  }

  private async loadForEdit(id: number): Promise<void> {
    this.loading.set(true);
    try {
      const support = await this.api.getSupport(id);
      if (!this.apoyos.canModify(support)) {
        this.error.set('Solo puedes modificar los apoyos que tú creaste.');
      } else {
        supportToForm(this.form, support);
      }
    } catch (e) {
      this.error.set(errorMessage(e));
    }
    this.loading.set(false);
  }

  // ---------- pasos ----------

  addStep(): void {
    if (this.steps.length < MAX_STEPS) {
      this.steps.push(newStepGroup());
    }
  }

  removeStep(index: number): void {
    if (this.steps.length > 1) {
      this.steps.removeAt(index);
    }
  }

  moveStep(event: { index: number; direction: -1 | 1 }): void {
    const target = event.index + event.direction;
    if (target < 0 || target >= this.steps.length) {
      return;
    }
    const control = this.steps.at(event.index);
    this.steps.removeAt(event.index);
    this.steps.insert(target, control);
  }

  clearPictogram(index: number): void {
    this.steps.at(index).patchValue({ arasaac_id: null, palabra: '', imagen_url: '' });
  }

  // ---------- pictogramas ----------

  openPicker(index: number): void {
    this.pictos.set([]);
    this.pictoError.set('');
    this.pictoSearched.set(false);
    this.pickerIndex.set(index);
  }

  async searchPictograms(q: string): Promise<void> {
    this.pictoLoading.set(true);
    this.pictoError.set('');
    try {
      const res = await this.api.searchPictograms(q);
      this.pictos.set(res.items);
    } catch (e) {
      this.pictos.set([]);
      this.pictoError.set(errorMessage(e));
    }
    this.pictoSearched.set(true);
    this.pictoLoading.set(false);
  }

  pickPictogram(picto: Pictogram): void {
    const index = this.pickerIndex();
    if (index !== null) {
      this.steps.at(index).patchValue({ arasaac_id: picto.arasaac_id, palabra: picto.palabra, imagen_url: picto.imagen_url });
    }
    this.pickerIndex.set(null);
  }

  // ---------- guardar ----------

  async save(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    try {
      const input = formToInput(this.form.getRawValue());
      const id = this.editingId();

      if (id === null) {
        await this.api.createSupport(input);
        this.toast.show('Apoyo creado correctamente');
      } else {
        await this.api.updateSupport(id, input);
        this.toast.show('Cambios guardados');
      }
      await this.router.navigate(['/piar/supports']);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
    this.saving.set(false);
  }

  cancel(): void {
    void this.router.navigate(['/piar/supports']);
  }
}
