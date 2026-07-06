const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 8080;

const clientes = [
  { id: 1, nombre: 'Cliente A' },
  { id: 2, nombre: 'Cliente B' }
];

const productos = [
  { id: 1, nombre: 'Producto 1', precio: 100 },
  { id: 2, nombre: 'Producto 2', precio: 200 }
];

const pedidos = [
  { id: 1, clienteId: 1, total: 150 },
  { id: 2, clienteId: 2, total: 200 }
];

const pagos = [
  { id: 1, pedidoId: 1, estado: 'PENDIENTE', monto: 150 },
  { id: 2, pedidoId: 2, estado: 'COMPLETADO', monto: 200 }
];

app.get('/api/clientes', (req, res) => {
  res.json(clientes);
});

app.get('/api/productos', (req, res) => {
  res.json(productos);
});

app.get('/api/pedidos', (req, res) => {
  res.json(pedidos);
});

app.get('/api/pagos', (req, res) => {
  const { estado } = req.query;
  if (estado) {
    return res.json(pagos.filter(p => p.estado === estado));
  }
  res.json(pagos);
});

app.listen(port, () => {
  console.log(`Mock API server listening on http://localhost:${port}`);
});
