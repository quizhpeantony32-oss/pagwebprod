import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage)
	},
	{
		path: 'productos',
		loadComponent: () => import('./features/productos/productos.page').then((m) => m.ProductosPage)
	},
	{
		path: 'clientes',
		loadComponent: () => import('./features/clientes/clientes.page').then((m) => m.ClientesPage)
	},
	{
		path: 'ventas',
		loadComponent: () => import('./features/ventas/ventas.page').then((m) => m.VentasPage)
	},
	{
		path: 'pedidos',
		loadComponent: () => import('./features/pedidos/pedidos.page').then((m) => m.PedidosPage)
	},
	{
		path: 'pagos',
		loadComponent: () => import('./features/pagos/pagos.page').then((m) => m.PagosPage)
	},
	{
		path: '**',
		redirectTo: ''
	}
];
