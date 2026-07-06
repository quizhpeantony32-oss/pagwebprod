import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
}

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
}

interface Pedido {
  id: number;
  fecha: string;
  estado: string;
  total: number;
  cliente: Cliente;
}

interface Venta {
  id: number;
  fecha?: string;
  total?: number;
  cliente?: Cliente;
}

interface Pago {
  id: number;
  fechaPago: string;
  monto: number;
  metodo: string;
  estado: string;
  venta: Venta;
}

let clientes: Cliente[] = [
  { id: 1, nombre: 'Juan Pérez', email: 'juan@example.com', telefono: '555-1234', direccion: 'Calle 1' },
  { id: 2, nombre: 'María García', email: 'maria@example.com', telefono: '555-5678', direccion: 'Calle 2' },
];

let productos: Producto[] = [
  { id: 1, nombre: 'Producto A', descripcion: 'Desc A', precio: 100, stock: 10 },
  { id: 2, nombre: 'Producto B', descripcion: 'Desc B', precio: 200, stock: 5 },
];

let pedidos: Pedido[] = [
  { id: 1, fecha: '2024-01-15', estado: 'PENDIENTE', total: 150, cliente: clientes[0] },
];

let ventas: Venta[] = [
  { id: 1, fecha: '2024-01-15', total: 150, cliente: clientes[0] },
];

let pagos: Pago[] = [
  { id: 1, fechaPago: '2024-01-15', monto: 150, metodo: 'EFECTIVO', estado: 'PENDIENTE', venta: ventas[0] },
];

app.get('/api/clientes', (_req, res) => {
  res.json(clientes);
});

app.post('/api/clientes', (req, res) => {
  const cliente: Cliente = { id: Date.now(), ...req.body };
  clientes.push(cliente);
  res.status(201).json(cliente);
});

app.put('/api/clientes/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = clientes.findIndex(c => c.id === id);
  if (index >= 0) {
    clientes[index] = { ...clientes[index], ...req.body };
    res.json(clientes[index]);
  } else {
    res.status(404).json({ message: 'Cliente no encontrado' });
  }
});

app.delete('/api/clientes/:id', (req, res) => {
  const id = Number(req.params.id);
  clientes = clientes.filter(c => c.id !== id);
  res.status(204).send();
});

app.get('/api/productos', (_req, res) => {
  res.json(productos);
});

app.post('/api/productos', (req, res) => {
  const producto: Producto = { id: Date.now(), ...req.body };
  productos.push(producto);
  res.status(201).json(producto);
});

app.put('/api/productos/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = productos.findIndex(p => p.id === id);
  if (index >= 0) {
    productos[index] = { ...productos[index], ...req.body };
    res.json(productos[index]);
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

app.delete('/api/productos/:id', (req, res) => {
  const id = Number(req.params.id);
  productos = productos.filter(p => p.id !== id);
  res.status(204).send();
});

app.get('/api/pedidos', (_req, res) => {
  res.json(pedidos);
});

app.post('/api/pedidos', (req, res) => {
  const cliente = clientes.find(c => c.id === req.body.clienteId);
  const pedido: Pedido = {
    id: Date.now(),
    fecha: new Date().toISOString(),
    estado: 'PENDIENTE',
    total: 0,
    cliente: cliente || clientes[0],
  };
  pedidos.push(pedido);
  res.status(201).json(pedido);
});

app.patch('/api/pedidos/:id/estado', (req, res) => {
  const id = Number(req.params.id);
  const index = pedidos.findIndex(p => p.id === id);
  if (index >= 0) {
    pedidos[index] = { ...pedidos[index], estado: req.body.estado };
    res.json(pedidos[index]);
  } else {
    res.status(404).json({ message: 'Pedido no encontrado' });
  }
});

app.delete('/api/pedidos/:id', (req, res) => {
  const id = Number(req.params.id);
  pedidos = pedidos.filter(p => p.id !== id);
  res.status(204).send();
});

app.get('/api/ventas', (_req, res) => {
  res.json(ventas);
});

app.post('/api/ventas', (req, res) => {
  const venta: Venta = { id: Date.now(), ...req.body };
  ventas.push(venta);
  res.status(201).json(venta);
});

app.put('/api/ventas/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = ventas.findIndex(v => v.id === id);
  if (index >= 0) {
    ventas[index] = { ...ventas[index], ...req.body };
    res.json(ventas[index]);
  } else {
    res.status(404).json({ message: 'Venta no encontrada' });
  }
});

app.delete('/api/ventas/:id', (req, res) => {
  const id = Number(req.params.id);
  ventas = ventas.filter(v => v.id !== id);
  res.status(204).send();
});

app.get('/api/pagos', (req, res) => {
  let result = [...pagos];
  const estado = req.query['estado'];
  const ventaId = req.query['ventaId'];
  if (estado && typeof estado === 'string') {
    result = result.filter(p => p.estado === estado);
  }
  if (ventaId && typeof ventaId === 'string') {
    result = result.filter(p => p.venta.id === Number(ventaId));
  }
  res.json(result);
});

app.post('/api/pagos', (req, res) => {
  const ventaId = Number(req.query['ventaId']);
  const monto = Number(req.query['monto']) || 0;
  const metodo = (req.query['metodo'] as string) || 'EFECTIVO';
  const venta = ventas.find(v => v.id === ventaId);
  const pago: Pago = {
    id: Date.now(),
    fechaPago: new Date().toISOString(),
    monto,
    metodo,
    estado: 'PENDIENTE',
    venta: venta || { id: ventaId },
  };
  pagos.push(pago);
  res.status(201).json(pago);
});

app.put('/api/pagos/:id/aprobar', (req, res) => {
  const id = Number(req.params.id);
  const index = pagos.findIndex(p => p.id === id);
  if (index >= 0) {
    pagos[index] = { ...pagos[index], estado: 'APROBADO' };
    res.json(pagos[index]);
  } else {
    res.status(404).json({ message: 'Pago no encontrado' });
  }
});

app.put('/api/pagos/:id/rechazar', (req, res) => {
  const id = Number(req.params.id);
  const index = pagos.findIndex(p => p.id === id);
  if (index >= 0) {
    pagos[index] = { ...pagos[index], estado: 'RECHAZADO' };
    res.json(pagos[index]);
  } else {
    res.status(404).json({ message: 'Pago no encontrado' });
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);