import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ApiService, EstadoPago, MetodoPago, Pago, Venta } from '../../core/api.service';

@Component({
  selector: 'app-pagos-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './pagos.page.html',
  styleUrl: './pagos.page.css'
})
export class PagosPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly pagos = signal<Pago[]>([]);
  protected readonly ventas = signal<Venta[]>([]);
  protected readonly loading = signal(this.isBrowser);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly estadoOptions: EstadoPago[] = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
  protected readonly metodoOptions: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];

  protected readonly filterForm = this.fb.nonNullable.group({
    ventaId: [0],
    estado: ['' as EstadoPago | '']
  });

  protected readonly createForm = this.fb.nonNullable.group({
    ventaId: [0, [Validators.required, Validators.min(1)]],
    monto: [0, [Validators.required, Validators.min(0.01)]],
    metodo: ['TARJETA' as MetodoPago, Validators.required]
  });

  constructor() {
    if (this.isBrowser) {
      this.loadData();
    }
  }

  protected loadPagos(): void {
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const rawFilter = this.filterForm.getRawValue();
    const ventaId = Number(rawFilter.ventaId);

    forkJoin({
      ventas: this.api.getVentas(),
      pagos: this.api.getPagos({
        ventaId: ventaId > 0 ? ventaId : undefined,
        estado: rawFilter.estado || undefined
      })
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ ventas, pagos }) => {
          this.ventas.set([...ventas].sort((left, right) => right.id - left.id));
          this.pagos.set([...pagos].sort((left, right) => right.id - left.id));
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      ventaId: 0,
      estado: ''
    });
    this.loadData();
  }

  protected submitPago(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const payload = this.createForm.getRawValue();

    this.api
      .crearPago({
        ventaId: Number(payload.ventaId),
        monto: Number(payload.monto),
        metodo: payload.metodo
      })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.createForm.reset({
            ventaId: 0,
            monto: 0,
            metodo: 'TARJETA'
          });
          this.loadData();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  protected aprobarPago(pago: Pago): void {
    this.errorMessage.set(null);
    this.api
      .aprobarPago(pago.id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => this.loadData(),
        error: (error: unknown) => {
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  protected rechazarPago(pago: Pago): void {
    this.errorMessage.set(null);
    this.api
      .rechazarPago(pago.id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => this.loadData(),
        error: (error: unknown) => {
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }
}
