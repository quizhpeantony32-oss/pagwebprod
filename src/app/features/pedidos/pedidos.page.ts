import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  ApiService,
  Cliente,
  EstadoPedido,
  ItemPedidoPayload,
  Pedido,
  Producto
} from '../../core/api.service';

interface DraftPedidoItem {
  productoId: number;
  productoNombre: string;
  cantidad: number;
}

@Component({
  selector: 'app-pedidos-page',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './pedidos.page.html',
  styleUrl: './pedidos.page.css'
})
export class PedidosPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly pedidos = signal<Pedido[]>([]);

  protected readonly loading = signal(this.isBrowser);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly estadoOptions: EstadoPedido[] = [
    'PENDIENTE',
    'CONFIRMADO',
    'ENVIADO',
    'ENTREGADO',
    'CANCELADO'
  ];

  protected readonly createForm = this.fb.nonNullable.group({
    clienteId: [0, [Validators.required, Validators.min(1)]],
    productoId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(1)]]
  });

  protected readonly estadoForm = this.fb.nonNullable.group({
    estado: ['PENDIENTE' as EstadoPedido, Validators.required]
  });

  protected readonly draftItems = signal<DraftPedidoItem[]>([]);

  constructor() {
    if (this.isBrowser) {
      this.loadData();
    }
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      clientes: this.api.getClientes(),
      productos: this.api.getProductos(),
      pedidos: this.api.getPedidos()
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ clientes, productos, pedidos }) => {
          this.clientes.set([...clientes].sort((left, right) => left.nombre.localeCompare(right.nombre)));
          this.productos.set([...productos].sort((left, right) => left.nombre.localeCompare(right.nombre)));
          this.pedidos.set([...pedidos].sort((left, right) => right.id - left.id));
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  protected addItem(): void {
    const productoId = Number(this.createForm.controls.productoId.value);
    const cantidad = Number(this.createForm.controls.cantidad.value);

    if (!productoId || cantidad <= 0) {
      return;
    }

    const producto = this.productos().find((item) => item.id === productoId);
    if (!producto) {
      return;
    }

    const existingItem = this.draftItems().find((item) => item.productoId === productoId);
    if (existingItem) {
      this.draftItems.update((items) =>
        items.map((item) =>
          item.productoId === productoId
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        )
      );
    } else {
      this.draftItems.update((items) => [
        ...items,
        {
          productoId,
          productoNombre: producto.nombre,
          cantidad
        }
      ]);
    }

    this.createForm.patchValue({ cantidad: 1 });
  }

  protected removeDraftItem(productoId: number): void {
    this.draftItems.update((items) => items.filter((item) => item.productoId !== productoId));
  }

  protected submitPedido(): void {
    const clienteId = Number(this.createForm.controls.clienteId.value);
    const items = this.toItemsPayload();

    if (!clienteId || items.length === 0) {
      this.errorMessage.set('Selecciona un cliente y agrega al menos un producto al pedido.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    this.api
      .crearPedido({ clienteId, items })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.resetCreateForm();
          this.loadData();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  protected changeEstado(pedido: Pedido, value: string): void {
    this.errorMessage.set(null);

    this.api
      .actualizarEstadoPedido(pedido.id, value as EstadoPedido)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => this.loadData(),
        error: (error: unknown) => {
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  protected deletePedido(pedido: Pedido): void {
    const confirmed = globalThis.confirm(`Eliminar pedido #${pedido.id}?`);
    if (!confirmed) {
      return;
    }

    this.api
      .eliminarPedido(pedido.id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => this.loadData(),
        error: (error: unknown) => {
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  private toItemsPayload(): ItemPedidoPayload[] {
    return this.draftItems().map((item) => ({
      productoId: item.productoId,
      cantidad: item.cantidad
    }));
  }

  private resetCreateForm(): void {
    this.createForm.reset({
      clienteId: 0,
      productoId: 0,
      cantidad: 1
    });
    this.draftItems.set([]);
  }
}
