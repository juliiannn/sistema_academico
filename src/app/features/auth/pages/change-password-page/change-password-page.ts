import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { PermissionsService } from '../../../../core/services/permissions';
import { errorMessage } from '../../../../core/utils/format';
import { Alert } from '../../../../shared/components/alert/alert';
import { Button } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { Logo } from '../../../../shared/components/logo/logo';

// Equivale a pages/change-password.html
@Component({
  selector: 'app-change-password-page',
  imports: [ReactiveFormsModule, Logo, FormField, Button, Alert],
  templateUrl: './change-password-page.html',
  host: { class: 'login-page' }
})
export class ChangePasswordPage {

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private permissions = inject(PermissionsService);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly message = signal('');
  readonly isError = signal(false);

  async save(): Promise<void> {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Completa ambos campos. La nueva contraseña debe tener al menos 8 caracteres.');
      this.isError.set(true);
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();

    try {

      await this.auth.changePassword(currentPassword, newPassword);

      await this.permissions.load(true);
      await this.router.navigateByUrl(this.permissions.firstPath());

    } catch (error) {

      this.isError.set(true);
      this.message.set(errorMessage(error));
    }
  }
}
