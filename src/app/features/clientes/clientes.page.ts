import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService, Cliente, CrearClientePayload } from '../../core/api.service';

@Component({
  selector: 'app-clientes-page',
  imports: [ReactiveFormsModule],
  templateUrl: './clientes.page.html',
  styleUrl: './clientes.page.css'
})
export class ClientesPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly loading = signal(this.isBrowser);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    direccion: ['', [Validators.required, Validators.maxLength(220)]]
  });

  constructor() {
    if (this.isBrowser) {
      this.loadClientes();
    }
  }

  protected loadClientes(): void {
    this.loading.set(true);
    this.api
      .getClientes()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (clientes) => {
          this.clientes.set([...clientes].sort((left, right) => right.id - left.id));
          this.loading.set(false);
          this.errorMessage.set(null);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const payload = this.toPayload();
    const id = this.editingId();
    const request$ = id === null
      ? this.api.crearCliente(payload)
      : this.api.actualizarCliente(id, payload);

    request$.pipe(takeUntilDestroyed()).subscribe({
      next: () => {
        this.resetForm();
        this.loadClientes();
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.api.toErrorMessage(error));
        this.saving.set(false);
      }
    });
  }

  protected startEdit(cliente: Cliente): void {
    this.editingId.set(cliente.id);
    this.form.patchValue({
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      direccion: cliente.direccion
    });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected remove(cliente: Cliente): void {
    const confirmed = globalThis.confirm(`Eliminar cliente ${cliente.nombre}?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    this.api
      .eliminarCliente(cliente.id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          if (this.editingId() === cliente.id) {
            this.resetForm();
          }
          this.loadClientes();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  private toPayload(): CrearClientePayload {
    const rawValue = this.form.getRawValue();

    return {
      nombre: rawValue.nombre.trim(),
      email: rawValue.email.trim(),
      telefono: rawValue.telefono.trim(),
      direccion: rawValue.direccion.trim()
    };
  }

  private resetForm(): void {
    this.form.reset({
      nombre: '',
      email: '',
      telefono: '',
      direccion: ''
    });
    this.editingId.set(null);
  }
}
