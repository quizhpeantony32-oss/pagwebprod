import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService, CrearProductoPayload, Producto } from '../../core/api.service';

@Component({
  selector: 'app-productos-page',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './productos.page.html',
  styleUrl: './productos.page.css'
})
export class ProductosPage {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly loading = signal(this.isBrowser);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', [Validators.maxLength(300)]],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    if (this.isBrowser) {
      this.loadProductos();
    }
  }

  protected loadProductos(): void {
    this.loading.set(true);
    this.api
      .getProductos()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (productos) => {
          this.productos.set([...productos].sort((left, right) => right.id - left.id));
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
      ? this.api.crearProducto(payload)
      : this.api.actualizarProducto(id, payload);

    request$.pipe(takeUntilDestroyed()).subscribe({
      next: () => {
        this.resetForm();
        this.loadProductos();
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.api.toErrorMessage(error));
        this.saving.set(false);
      }
    });
  }

  protected startEdit(producto: Producto): void {
    this.editingId.set(producto.id);
    this.form.patchValue({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      stock: producto.stock
    });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected remove(producto: Producto): void {
    const confirmed = globalThis.confirm(`Eliminar producto ${producto.nombre}?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    this.api
      .eliminarProducto(producto.id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          if (this.editingId() === producto.id) {
            this.resetForm();
          }
          this.loadProductos();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.api.toErrorMessage(error));
        }
      });
  }

  private toPayload(): CrearProductoPayload {
    const rawValue = this.form.getRawValue();

    return {
      nombre: rawValue.nombre.trim(),
      descripcion: rawValue.descripcion.trim(),
      precio: Number(rawValue.precio),
      stock: Number(rawValue.stock)
    };
  }

  private resetForm(): void {
    this.form.reset({
      nombre: '',
      descripcion: '',
      precio: 0,
      stock: 0
    });
    this.editingId.set(null);
  }
}
