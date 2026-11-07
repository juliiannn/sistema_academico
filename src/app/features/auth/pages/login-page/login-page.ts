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

// Equivale a pages/login.html + assets/js/login.js
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, Logo, FormField, Button, Alert],
  templateUrl: './login-page.html',
  host: { class: 'login-page' }
})
export class LoginPage {

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private permissions = inject(PermissionsService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  readonly message = signal('');
  readonly isError = signal(false);

  async login(): Promise<void> {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set('Ingresa un correo válido y tu contraseña.');
      this.isError.set(true);
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.message.set('Iniciando sesión...');
    this.isError.set(false);

    try {

      const session = await this.auth.login(email.trim(), password);

      if (session.mustChangePassword) {
        await this.router.navigate(['/change-password']);
        return;
      }

      // Los módulos del rol se cargan de la base de datos (role_modules) y se entra al primero permitido
      await this.permissions.load(true);
      await this.router.navigateByUrl(this.permissions.firstPath());

    } catch (error) {

      this.message.set(errorMessage(error));
      this.isError.set(true);
    }
  }

  forgotPassword(event: Event): void {

    event.preventDefault();

    alert(
      'Este sistema no tiene recuperación automática por ' +
      'correo electrónico.\n\n' +
      'Si olvidaste tu contraseña, pide a un administrador ' +
      'que la restablezca desde el panel de Usuarios. ' +
      'Quedará igual a tu número de documento y se te ' +
      'pedirá cambiarla al iniciar sesión.'
    );
  }
}
