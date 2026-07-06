import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ApiService, Cliente, Venta } from '../../core/api.service';

@Component({
  selector: 'app-ventas-page',
  imports: [ReactiveFormsModule, DatePipe, CurrencyPipe],
  templateUrl: './ventas.page.html',
  styleUrl: './ventas.page.css'
})
export class VentasPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly ventas = signal<Venta[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly loading = signal(this.isBrowser);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    clienteId: [0, [Validators.required, Validators.min(1)]],
    fecha: [''],
    total: [0, [Validators.min(0)]]
  });

  constructor() {
    if (this.isBrowser) {
      this.loadData();
    }
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      ventas: this.api.getVentas(),
      clientes: this.api.getClientes()
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ ventas, clientes }) => {
          this.ventas.set([...ventas].sort((left, right) => right.id - left.id));
          this.clientes.set([...clientes].sort((left, right) => left.nombre.localeCompare(right.nombre)));
          this.loading.set(false);
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

    const raw = this.form.getRawValue();
    const payload = {
      clienteId: Number(raw.clienteId),
      fecha: raw.fecha || undefined,
      total: Number(raw.total) > 0 ? Number(raw.total) : undefined
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const id = this.editingId();
    const request$ = id === null
      ? this.api.crearVenta(payload)
      : this.api.actualizarVenta(id, {
          clienteId: payload.clienteId,
          fecha: payload.fecha
        });

    request$.pipe(takeUntilDestroyed()).subscribe({
      next: () => {
        this.saving.set(false);
        this.resetForm();
        this.loadData();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(this.api.toErrorMessage(error));
      }
    });
  }

  protected startEdit(venta: Venta): void {
    this.editingId.set(venta.id);
    this.form.patchValue({
      clienteId: venta.cliente?.id ?? 0,
      fecha: venta.fecha ?? '',
      total: typeof venta.total === 'number' ? venta.total : 0
    });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected remove(venta: Venta): void {
    const confirmed = globalThis.confirm(`Eliminar venta #${venta.id}?`);
    if (!confirmed) {
      return;
    }

    this.api
      .eliminarVenta(venta.id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          if (this.editingId() === venta.id) {
            this.resetForm();
          }
          this.loadData();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  private resetForm(): void {
    this.form.reset({
      clienteId: 0,
      fecha: '',
      total: 0
    });
    this.editingId.set(null);
  }
}
