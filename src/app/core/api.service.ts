import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { apiConfig } from './api.config';

export interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
}

export interface Pedido {
  id: number;
  fecha: string;
  estado: string;
  total: number;
  cliente: Cliente;
}

export interface ItemPedidoPayload {
  productoId: number;
  cantidad: number;
}

export interface CrearPedidoPayload {
  clienteId: number;
  items: ItemPedidoPayload[];
}

export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';

export interface Venta {
  id: number;
  fecha?: string;
  total?: number;
  cliente?: Cliente;
}

export interface CrearVentaPayload {
  clienteId: number;
  fecha?: string;
  total?: number;
}

export interface ActualizarVentaPayload {
  clienteId: number;
  fecha?: string;
}

export interface Pago {
  id: number;
  fechaPago: string;
  monto: number;
  metodo: string;
  estado: string;
  venta: Venta;
}

export type EstadoPago = 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

export interface DashboardSnapshot {
  clientes: Cliente[];
  productos: Producto[];
  pedidos: Pedido[];
  pagosPendientes: Pago[];
}

export type CrearProductoPayload = Omit<Producto, 'id'>;
export type ActualizarProductoPayload = Omit<Producto, 'id'>;
export type CrearClientePayload = Omit<Cliente, 'id'>;
export type ActualizarClientePayload = Omit<Cliente, 'id'>;
export interface CrearPagoPayload {
  ventaId: number;
  monto: number;
  metodo: MetodoPago;
}

interface ApiErrorBody {
  message?: string;
  error?: string;
}

@Service()
export class ApiService {
  private readonly http = inject(HttpClient);

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${apiConfig.baseUrl}/clientes`);
  }

  crearCliente(payload: CrearClientePayload): Observable<Cliente> {
    return this.http.post<Cliente>(`${apiConfig.baseUrl}/clientes`, payload);
  }

  actualizarCliente(id: number, payload: ActualizarClientePayload): Observable<Cliente> {
    return this.http.put<Cliente>(`${apiConfig.baseUrl}/clientes/${id}`, payload);
  }

  eliminarCliente(id: number): Observable<void> {
    return this.http.delete<void>(`${apiConfig.baseUrl}/clientes/${id}`);
  }

  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${apiConfig.baseUrl}/productos`);
  }

  crearProducto(payload: CrearProductoPayload): Observable<Producto> {
    return this.http.post<Producto>(`${apiConfig.baseUrl}/productos`, payload);
  }

  actualizarProducto(id: number, payload: ActualizarProductoPayload): Observable<Producto> {
    return this.http.put<Producto>(`${apiConfig.baseUrl}/productos/${id}`, payload);
  }

  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${apiConfig.baseUrl}/productos/${id}`);
  }

  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${apiConfig.baseUrl}/pedidos`);
  }

  crearPedido(payload: CrearPedidoPayload): Observable<Pedido> {
    return this.http.post<Pedido>(`${apiConfig.baseUrl}/pedidos`, payload);
  }

  actualizarEstadoPedido(id: number, estado: EstadoPedido): Observable<Pedido> {
    return this.http.patch<Pedido>(`${apiConfig.baseUrl}/pedidos/${id}/estado`, { estado });
  }

  eliminarPedido(id: number): Observable<void> {
    return this.http.delete<void>(`${apiConfig.baseUrl}/pedidos/${id}`);
  }

  getVentas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${apiConfig.baseUrl}/ventas`);
  }

  crearVenta(payload: CrearVentaPayload): Observable<Venta> {
    const body: {
      cliente: { id: number };
      fecha?: string;
      total?: number;
    } = {
      cliente: { id: payload.clienteId }
    };

    if (payload.fecha) {
      body.fecha = payload.fecha;
    }
    if (typeof payload.total === 'number') {
      body.total = payload.total;
    }

    return this.http.post<Venta>(`${apiConfig.baseUrl}/ventas`, body);
  }

  actualizarVenta(id: number, payload: ActualizarVentaPayload): Observable<Venta> {
    const body: {
      cliente: { id: number };
      fecha?: string;
    } = {
      cliente: { id: payload.clienteId }
    };

    if (payload.fecha) {
      body.fecha = payload.fecha;
    }

    return this.http.put<Venta>(`${apiConfig.baseUrl}/ventas/${id}`, body);
  }

  eliminarVenta(id: number): Observable<void> {
    return this.http.delete<void>(`${apiConfig.baseUrl}/ventas/${id}`);
  }

  getPagos(filters?: { ventaId?: number; estado?: EstadoPago }): Observable<Pago[]> {
    const params: Record<string, string> = {};

    if (typeof filters?.ventaId === 'number') {
      params['ventaId'] = String(filters.ventaId);
    }
    if (filters?.estado) {
      params['estado'] = filters.estado;
    }

    return this.http.get<Pago[]>(`${apiConfig.baseUrl}/pagos`, { params });
  }

  crearPago(payload: CrearPagoPayload): Observable<Pago> {
    return this.http.post<Pago>(`${apiConfig.baseUrl}/pagos`, null, {
      params: {
        ventaId: String(payload.ventaId),
        monto: String(payload.monto),
        metodo: payload.metodo
      }
    });
  }

  aprobarPago(id: number): Observable<Pago> {
    return this.http.put<Pago>(`${apiConfig.baseUrl}/pagos/${id}/aprobar`, {});
  }

  rechazarPago(id: number): Observable<Pago> {
    return this.http.put<Pago>(`${apiConfig.baseUrl}/pagos/${id}/rechazar`, {});
  }

  getDashboardSnapshot(): Observable<DashboardSnapshot> {
    return forkJoin({
      clientes: this.http.get<Cliente[]>(`${apiConfig.baseUrl}/clientes`),
      productos: this.http.get<Producto[]>(`${apiConfig.baseUrl}/productos`),
      pedidos: this.http.get<Pedido[]>(`${apiConfig.baseUrl}/pedidos`).pipe(
        map((pedidos) => [...pedidos].sort((left, right) => right.id - left.id))
      ),
      pagosPendientes: this.http.get<Pago[]>(`${apiConfig.baseUrl}/pagos`, {
        params: {
          estado: 'PENDIENTE'
        }
      })
    });
  }

  toErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'error' in error
    ) {
      const httpError = error as { status: number; error: ApiErrorBody | string | null };

      if (httpError.status === 0) {
        return 'No fue posible conectar con la API. Revisa el proxy de desarrollo o CORS en el backend.';
      }

      if (typeof httpError.error === 'string' && httpError.error.trim()) {
        return httpError.error;
      }

      if (
        typeof httpError.error === 'object' &&
        httpError.error !== null &&
        typeof httpError.error.message === 'string' &&
        httpError.error.message.trim()
      ) {
        return httpError.error.message;
      }
    }

    return 'No se pudo cargar la informacion del tablero.';
  }
}