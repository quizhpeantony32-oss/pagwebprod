import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

import { ApiService, DashboardSnapshot } from '../../core/api.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardPage {
  private readonly api = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly sections = [
    {
      eyebrow: 'Inventario',
      title: 'Productos y stock',
      description: 'Controla catalogo, existencias y estado general del inventario.'
    },
    {
      eyebrow: 'Clientes',
      title: 'Relacion comercial',
      description: 'Gestiona datos de clientes y acelera la creación de nuevos pedidos.'
    },
    {
      eyebrow: 'Operacion',
      title: 'Pedidos y pagos',
      description: 'Monitorea operaciones pendientes para tomar decisiones a tiempo.'
    }
  ] as const;

  private readonly fallbackSnapshot: DashboardSnapshot = {
    clientes: [],
    productos: [],
    pedidos: [],
    pagosPendientes: []
  };

  protected readonly loading = signal(this.isBrowser);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly snapshotResponse = toSignal(
    (this.isBrowser ? this.api.getDashboardSnapshot() : of(this.fallbackSnapshot)).pipe(
      map((snapshot) => {
        this.loading.set(false);
        this.errorMessage.set(null);

        return snapshot;
      }),
      catchError((error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.api.toErrorMessage(error));

        return of(this.fallbackSnapshot);
      })
    ),
    { initialValue: this.fallbackSnapshot }
  );

  protected readonly snapshot = computed(() => this.snapshotResponse());
  protected readonly metrics = computed(() => {
    const snapshot = this.snapshot();
    const inventoryValue = snapshot.productos.reduce(
      (total, producto) => total + producto.precio * producto.stock,
      0
    );
    const activeOrders = snapshot.pedidos.filter(
      (pedido) => pedido.estado !== 'ENTREGADO' && pedido.estado !== 'CANCELADO'
    ).length;

    return [
      {
        label: 'Clientes registrados',
        value: snapshot.clientes.length.toString().padStart(2, '0')
      },
      {
        label: 'Pedidos activos',
        value: activeOrders.toString().padStart(2, '0')
      },
      {
        label: 'Pagos pendientes',
        value: snapshot.pagosPendientes.length.toString().padStart(2, '0')
      },
      {
        label: 'Valor inventario',
        value: new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0
        }).format(inventoryValue)
      }
    ];
  });

  protected readonly featuredProducts = computed(() => this.snapshot().productos.slice(0, 4));
  protected readonly latestOrders = computed(() => this.snapshot().pedidos.slice(0, 5));
  protected readonly pendingPayments = computed(() => this.snapshot().pagosPendientes.slice(0, 4));
}
