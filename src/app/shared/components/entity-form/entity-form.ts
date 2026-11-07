import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FieldDef, Option } from '../../../core/models/crud.model';
import { FormField } from '../form-field/form-field';

// Componente presentacional (igual que cliente-form de la práctica): recibe el FormGroup y los
// campos y los pinta. No sabe si se está creando o editando. Los selectores muestran NOMBRES.
@Component({
  selector: 'app-entity-form',
  imports: [ReactiveFormsModule, FormField],
  templateUrl: './entity-form.html'
})
export class EntityForm {

  readonly form = input.required<FormGroup>();
  readonly fields = input.required<FieldDef[]>();

  // Opciones por nombre de campo: { courseId: [{ value: '1', label: '10-A' }, ...] }
  readonly options = input<Record<string, Option[]>>({});

  // La página lo pone en true al intentar guardar, para mostrar los errores de todos los campos
  readonly submitted = input(false);

  optionsFor(field: FieldDef): Option[] {
    return this.options()[field.name] ?? [];
  }

  errorFor(name: string): string | null {

    const control = this.form().get(name);

    if (!control || !control.invalid || !(control.touched || this.submitted())) {
      return null;
    }

    return control.hasError('email') ? 'Formato de correo inválido' : 'Este campo es obligatorio';
  }
}
