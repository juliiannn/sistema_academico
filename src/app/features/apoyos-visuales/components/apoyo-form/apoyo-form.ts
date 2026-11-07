import { Component, computed, input, output } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Option } from '../../../../core/models/crud.model';
import { enumLabel, enumValues } from '../../../../core/models/enums';
import { Button } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { MAX_STEPS } from '../../models/apoyo.model';

// Formulario de un apoyo visual. Presentacional: recibe el FormGroup y avisa lo que el usuario hace.
@Component({
  selector: 'app-apoyo-form',
  imports: [ReactiveFormsModule, FormField, Button],
  templateUrl: './apoyo-form.html',
  styleUrl: './apoyo-form.css'
})
export class ApoyoForm {

  readonly form = input.required<FormGroup>();
  readonly students = input<Option[]>([]);
  readonly submitted = input(false);
  readonly saving = input(false);

  readonly addStep = output<void>();
  readonly removeStep = output<number>();
  readonly moveStep = output<{ index: number; direction: -1 | 1 }>();
  readonly choosePictogram = output<number>();
  readonly clearPictogram = output<number>();
  readonly save = output<void>();
  readonly cancel = output<void>();

  readonly maxSteps = MAX_STEPS;

  readonly types: Option[] = enumValues('supportType').map(value => ({ value, label: enumLabel('supportType', value) }));

  readonly steps = computed(() => (this.form().get('pasos') as FormArray).controls as FormGroup[]);

  readonly canAdd = computed(() => this.steps().length < MAX_STEPS);

  errorOf(control: AbstractControl | null): string | null {
    if (!control || !(control.touched || this.submitted()) || !control.errors) {
      return null;
    }
    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }
    if (control.errors['minlength']) {
      return 'Escribe al menos 3 caracteres.';
    }
    if (control.errors['maxlength']) {
      return 'Es demasiado largo.';
    }
    if (control.errors['min'] || control.errors['max']) {
      return 'Debe estar entre 1 y 240 minutos.';
    }
    return 'Valor no válido.';
  }

  field(name: string): AbstractControl | null {
    return this.form().get(name);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.save.emit();
  }
}
