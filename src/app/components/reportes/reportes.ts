import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BaseDatosService,
  Venta,
  Producto,
  Cliente,
  MovimientoInventario,
  Usuario,
} from '../../services/base-datos';

export interface ResumenKPI {
  totalVentas: number;
  totalIngresos: number;
  totalDescuentos: number;
  ventasAnuladas: number;
  ticketPromedio: number;
  productosStockBajo: number;
}

export interface VentaPorDia {
  fecha: string;
  total: number;
  cantidad: number;
}

export interface ProductoVendido {
  productoId: number;
  nombre: string;
  totalVendido: number;
  ingresos: number;
}

export interface ClienteCompra {
  clienteId?: number;
  nombre: string;
  totalCompras: number;
  totalGastado: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesComponent implements OnInit {

  cargando = false;

  usuarioActual: Usuario | null = null;
  fechaImpresion = new Date();

  fechaDesde = '';
  fechaHasta = '';

  kpi: ResumenKPI = {
    totalVentas: 0, totalIngresos: 0, totalDescuentos: 0,
    ventasAnuladas: 0, ticketPromedio: 0, productosStockBajo: 0,
  };

  ventasPorDia:         VentaPorDia[]          = [];
  productosMasVendidos: ProductoVendido[]       = [];
  clientesTopCompras:   ClienteCompra[]         = [];
  productosStockBajo:   Producto[]              = [];
  movimientos:          MovimientoInventario[]  = [];
  todasLasVentas:       Venta[]                 = [];

  filtroTipoMovimiento = '';
  movimientosFiltrados: (MovimientoInventario & { nombreProducto?: string })[] = [];
  productosMap: Map<number, string> = new Map();

  tabActiva: 'resumen' | 'ventas' | 'productos' | 'clientes' | 'inventario' | 'movimientos' = 'resumen';

  chartVentas: { x: number; y: number; h: number; fecha: string; total: number }[] = [];
  readonly CHART_W   = 680;
  readonly CHART_H   = 160;
  readonly CHART_PAD = 30;

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'exito' | 'error' = 'exito';
  private toastTimer: any;

  constructor(
    public  location: Location,
    private bd:  BaseDatosService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    try {
      const raw = sessionStorage.getItem('jeyrich_sesion');
      if (raw) this.usuarioActual = JSON.parse(raw) as Usuario;
    } catch { this.usuarioActual = null; }

    const hoy    = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaHasta = this.formatFecha(hoy);
    this.fechaDesde = this.formatFecha(inicio);
    this.cargarDatos();
  }

  private formatFecha(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    this.fechaImpresion = new Date();
    this.cdr.markForCheck();
    try {
      const desde = new Date(this.fechaDesde);
      const hasta = new Date(this.fechaHasta + 'T23:59:59');

      const [ventas, productos, clientes, movimientos] = await Promise.all([
        this.bd.obtenerTodos<Venta>(this.bd.ALMACENES.VENTAS),
        this.bd.obtenerTodos<Producto>(this.bd.ALMACENES.PRODUCTOS),
        this.bd.obtenerTodos<Cliente>(this.bd.ALMACENES.CLIENTES),
        this.bd.obtenerTodos<MovimientoInventario>(this.bd.ALMACENES.MOVIMIENTOS),
      ]);

      this.productosMap = new Map(productos.map(p => [p.id!, p.nombre]));

      const ventasPeriodo = ventas.filter(v => {
        const f = new Date(v.fechaVenta);
        return f >= desde && f <= hasta;
      });
      this.todasLasVentas = ventasPeriodo;

      const completadas     = ventasPeriodo.filter(v => v.estado === 'completada');
      const totalIngresos   = completadas.reduce((s, v) => s + v.total, 0);
      const totalDescuentos = completadas.reduce((s, v) => s + v.descuento, 0);

      this.kpi = {
        totalVentas:        completadas.length,
        totalIngresos,
        totalDescuentos,
        ventasAnuladas:     ventasPeriodo.filter(v => v.estado === 'anulada').length,
        ticketPromedio:     completadas.length ? totalIngresos / completadas.length : 0,
        productosStockBajo: productos.filter(p => p.activo && p.stock <= p.stockMinimo).length,
      };

      const mapaFechas = new Map<string, { total: number; cantidad: number }>();
      completadas.forEach(v => {
        const dia    = new Date(v.fechaVenta).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' });
        const actual = mapaFechas.get(dia) ?? { total: 0, cantidad: 0 };
        mapaFechas.set(dia, { total: actual.total + v.total, cantidad: actual.cantidad + 1 });
      });
      this.ventasPorDia = Array.from(mapaFechas.entries())
        .map(([fecha, d]) => ({ fecha, total: d.total, cantidad: d.cantidad }))
        .slice(-20);
      this.generarChart();

      const mapaProductos = new Map<number, { nombre: string; total: number; ingresos: number }>();
      completadas.forEach(v =>
        v.detalles.forEach(d => {
          const a = mapaProductos.get(d.productoId) ?? { nombre: d.nombreProducto, total: 0, ingresos: 0 };
          mapaProductos.set(d.productoId, { nombre: a.nombre, total: a.total + d.cantidad, ingresos: a.ingresos + d.subtotal });
        })
      );
      this.productosMasVendidos = Array.from(mapaProductos.entries())
        .map(([id, d]) => ({ productoId: id, nombre: d.nombre, totalVendido: d.total, ingresos: d.ingresos }))
        .sort((a, b) => b.totalVendido - a.totalVendido).slice(0, 10);

      const mapaClientes = new Map<string, { clienteId?: number; nombre: string; compras: number; gastado: number }>();
      completadas.forEach(v => {
        const key    = v.clienteId ? String(v.clienteId) : `gen_${v.nombreCliente}`;
        const nombre = v.nombreCliente || 'Cliente general';
        const a = mapaClientes.get(key) ?? { clienteId: v.clienteId, nombre, compras: 0, gastado: 0 };
        mapaClientes.set(key, { ...a, compras: a.compras + 1, gastado: a.gastado + v.total });
      });
      this.clientesTopCompras = Array.from(mapaClientes.values())
        .map(c => ({ clienteId: c.clienteId, nombre: c.nombre, totalCompras: c.compras, totalGastado: c.gastado }))
        .sort((a, b) => b.totalGastado - a.totalGastado).slice(0, 10);

      // Stock bajo
      this.productosStockBajo = productos
        .filter(p => p.activo && p.stock <= p.stockMinimo)
        .sort((a, b) => a.stock - b.stock);

      this.movimientos = movimientos
        .filter(m => { const f = new Date(m.fecha); return f >= desde && f <= hasta; })
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      this.filtrarMovimientos();

    } catch {
      this.mostrarToast('Error al cargar los reportes', 'error');
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  generarChart(): void {
    if (!this.ventasPorDia.length) { this.chartVentas = []; return; }
    const maxVal = Math.max(...this.ventasPorDia.map(v => v.total));
    const n      = this.ventasPorDia.length;
    const ancho  = this.CHART_W - this.CHART_PAD * 2;
    const alto   = this.CHART_H - 20;
    this.chartVentas = this.ventasPorDia.map((v, i) => {
      const h = maxVal ? (v.total / maxVal) * alto : 0;
      const x = this.CHART_PAD + (i / Math.max(n - 1, 1)) * ancho;
      return { x, y: alto - h + 10, h, fecha: v.fecha, total: v.total };
    });
  }

  filtrarMovimientos(): void {
    this.movimientosFiltrados = this.movimientos
      .filter(m => !this.filtroTipoMovimiento || m.tipo === this.filtroTipoMovimiento)
      .map(m => ({ ...m, nombreProducto: this.productosMap.get(m.productoId) ?? `Producto #${m.productoId}` }));
    this.cdr.markForCheck();
  }

  cambiarTab(tab: typeof this.tabActiva): void {
    this.tabActiva = tab;
    this.cdr.markForCheck();
  }

  aplicarFiltros(): void {
    if (!this.fechaDesde || !this.fechaHasta) {
      this.mostrarToast('Selecciona un rango de fechas', 'error');
      return;
    }
    this.cargarDatos();
  }

  get nombreTabActiva(): string {
    const nombres: Record<string, string> = {
      resumen:     'Resumen General',
      ventas:      'Detalle de Ventas',
      productos:   'Productos Más Vendidos',
      clientes:    'Clientes Top',
      inventario:  'Stock Bajo',
      movimientos: 'Movimientos de Inventario',
    };
    return nombres[this.tabActiva] ?? this.tabActiva;
  }

  exportarCSV(): void {
    let csv = '', nombre = '';
    if (this.tabActiva === 'ventas') {
      csv  = 'Fecha,Número,Cliente,Total,Descuento,Método,Estado\n';
      csv += this.todasLasVentas.map(v =>
        `${new Date(v.fechaVenta).toLocaleDateString('es-BO')},${v.numeroVenta},"${v.nombreCliente}",${v.total},${v.descuento},${v.metodoPago},${v.estado}`
      ).join('\n'); nombre = 'ventas';
    } else if (this.tabActiva === 'productos') {
      csv  = 'Producto,Unidades Vendidas,Ingresos (Bs)\n';
      csv += this.productosMasVendidos.map(p => `"${p.nombre}",${p.totalVendido},${p.ingresos.toFixed(2)}`).join('\n');
      nombre = 'productos_vendidos';
    } else if (this.tabActiva === 'clientes') {
      csv  = 'Cliente,Compras,Total Gastado (Bs)\n';
      csv += this.clientesTopCompras.map(c => `"${c.nombre}",${c.totalCompras},${c.totalGastado.toFixed(2)}`).join('\n');
      nombre = 'clientes_top';
    } else if (this.tabActiva === 'inventario') {
      csv  = 'Producto,Stock Actual,Stock Mínimo,Unidad\n';
      csv += this.productosStockBajo.map(p => `"${p.nombre}",${p.stock},${p.stockMinimo},${p.unidad}`).join('\n');
      nombre = 'stock_bajo';
    } else if (this.tabActiva === 'movimientos') {
      csv  = 'Fecha,Producto,Tipo,Cantidad,Motivo\n';
      csv += this.movimientosFiltrados.map(m =>
        `${new Date(m.fecha).toLocaleDateString('es-BO')},"${m.nombreProducto}",${m.tipo},${m.cantidad},"${m.motivo}"`
      ).join('\n'); nombre = 'movimientos';
    } else {
      csv  = 'KPI,Valor\n';
      csv += `Total Ventas,${this.kpi.totalVentas}\nIngresos (Bs),${this.kpi.totalIngresos.toFixed(2)}\n`;
      csv += `Descuentos (Bs),${this.kpi.totalDescuentos.toFixed(2)}\nVentas Anuladas,${this.kpi.ventasAnuladas}\n`;
      csv += `Ticket Promedio (Bs),${this.kpi.ticketPromedio.toFixed(2)}\nProductos Stock Bajo,${this.kpi.productosStockBajo}\n`;
      nombre = 'resumen_kpi';
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `reporte_${nombre}_${this.fechaDesde}_${this.fechaHasta}.csv`;
    a.click(); URL.revokeObjectURL(url);
    this.mostrarToast('Archivo CSV exportado correctamente', 'exito');
  }

  imprimirReporte(): void {
    this.fechaImpresion = new Date();
    this.cdr.markForCheck();
    setTimeout(() => window.print(), 150);
  }

  get maxProductoVendido(): number { return this.productosMasVendidos[0]?.totalVendido ?? 1; }
  get maxClienteGastado():  number { return this.clientesTopCompras[0]?.totalGastado ?? 1; }

  mostrarToast(mensaje: string, tipo: 'exito' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toastMensaje = mensaje; this.toastTipo = tipo; this.toastVisible = true;
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => { this.toastVisible = false; this.cdr.markForCheck(); }, 3500);
  }

  cerrarToast(): void {
    clearTimeout(this.toastTimer);
    this.toastVisible = false;
    this.cdr.markForCheck();
  }
}