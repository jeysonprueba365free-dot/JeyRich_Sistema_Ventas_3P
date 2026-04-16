import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  NgZone,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BaseDatosService,
  Venta,
  DetalleVenta,
  Producto,
  Cliente,
} from '../../services/base-datos';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasComponent implements OnInit {

  ventas: Venta[]          = [];
  ventasFiltradas: Venta[] = [];
  productos: Producto[]    = [];
  clientes: Cliente[]      = [];

  textoBusqueda    = '';
  filtroEstado     = '';
  filtroMetodo     = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  get totalVentas()       { return this.ventas.length; }
  get ventasCompletadas() { return this.ventas.filter(v => v.estado === 'completada').length; }
  get ventasAnuladas()    { return this.ventas.filter(v => v.estado === 'anulada').length; }
  get ingresoTotal() {
    return this.ventas
      .filter(v => v.estado === 'completada')
      .reduce((s, v) => s + v.total, 0);
  }

  cargando  = false;
  guardando = false;
  errorModal = '';

  mostrarModal        = false;
  mostrarModalAnular  = false;
  mostrarModalDetalle = false;
  ventaEditando:  Venta | null = null;
  ventaAAnular:   Venta | null = null;
  ventaDetalle:   Venta | null = null;

  formularioVenta: Partial<Venta> & { detalles: DetalleVenta[] } = this.formularioVacio();

  busquedaProducto      = '';
  productosFiltrados: Producto[] = [];
  cantidadAgregar       = 1;
  productoSeleccionado: Producto | null = null;

  mostrarFormCliente = false;
  guardandoCliente   = false;
  errorCliente       = '';
  nuevoCliente: Partial<Cliente> = this.clienteVacio();

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'exito' | 'error' = 'exito';
  private toastTimer: any;

  readonly METODOS_PAGO = [
    { value: 'efectivo',      label: 'Efectivo' },
    { value: 'tarjeta',       label: 'Tarjeta' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'yape',          label: 'Yape' },
    { value: 'plin',          label: 'Plin' },
  ];

  constructor(
    public  location: Location,
    private bd:  BaseDatosService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    this.cdr.markForCheck();
    try {
      const [ventas, productos, clientes] = await Promise.all([
        this.bd.obtenerTodos<Venta>(this.bd.ALMACENES.VENTAS),
        this.bd.obtenerTodos<Producto>(this.bd.ALMACENES.PRODUCTOS),
        this.bd.obtenerTodos<Cliente>(this.bd.ALMACENES.CLIENTES),
      ]);
      this.ventas    = ventas.sort((a, b) =>
        new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime()
      );
      this.productos = productos.filter(p => p.activo);
      this.clientes  = clientes;
      this.filtrarVentas();
    } catch {
      this.mostrarToast('Error al cargar las ventas', 'error');
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  filtrarVentas(): void {
    const texto = this.textoBusqueda.toLowerCase().trim();
    this.ventasFiltradas = this.ventas.filter(v => {
      const coincideTexto  = !texto ||
        v.numeroVenta.toLowerCase().includes(texto) ||
        v.nombreCliente.toLowerCase().includes(texto);
      const coincideEstado = !this.filtroEstado  || v.estado     === this.filtroEstado;
      const coincideMetodo = !this.filtroMetodo  || v.metodoPago === this.filtroMetodo;
      const fecha = new Date(v.fechaVenta);
      const coincideDesde  = !this.filtroFechaDesde || fecha >= new Date(this.filtroFechaDesde);
      const coincideHasta  = !this.filtroFechaHasta || fecha <= new Date(this.filtroFechaHasta + 'T23:59:59');
      return coincideTexto && coincideEstado && coincideMetodo && coincideDesde && coincideHasta;
    });
    this.cdr.markForCheck();
  }

  limpiarFiltros(): void {
    this.textoBusqueda    = '';
    this.filtroEstado     = '';
    this.filtroMetodo     = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtrarVentas();
  }

  get hayFiltros(): boolean {
    return !!(this.textoBusqueda || this.filtroEstado || this.filtroMetodo ||
              this.filtroFechaDesde || this.filtroFechaHasta);
  }

  async abrirModalCrear(): Promise<void> {
    this.ventaEditando        = null;
    this.formularioVenta      = this.formularioVacio();
    this.busquedaProducto     = '';
    this.productosFiltrados   = [];
    this.productoSeleccionado = null;
    this.cantidadAgregar      = 1;
    this.errorModal           = '';
    this.mostrarFormCliente   = false;
    this.nuevoCliente         = this.clienteVacio();
    this.errorCliente         = '';
    try {
      this.formularioVenta.numeroVenta = await this.bd.generarNumeroVenta();
    } catch {
      this.formularioVenta.numeroVenta = 'VTA-AUTO';
    }
    this.mostrarModal = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    this.mostrarModal         = false;
    this.ventaEditando        = null;
    this.errorModal           = '';
    this.busquedaProducto     = '';
    this.productosFiltrados   = [];
    this.productoSeleccionado = null;
    this.mostrarFormCliente   = false;
    this.cdr.markForCheck();
  }

  buscarProductos(): void {
    this.zone.run(() => {
      const q = this.busquedaProducto.toLowerCase().trim();
      if (!q) {
        this.productosFiltrados = [];
        this.cdr.markForCheck();
        return;
      }
      this.productosFiltrados = this.productos.filter(p =>
        p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
      ).slice(0, 8);
      this.cdr.markForCheck();
    });
  }

  seleccionarProducto(p: Producto): void {
    this.productoSeleccionado = p;
    this.busquedaProducto     = p.nombre;
    this.productosFiltrados   = [];
    this.cantidadAgregar      = 1;
    this.cdr.markForCheck();
  }

  agregarDetalle(): void {
    if (!this.productoSeleccionado) {
      this.errorModal = 'Selecciona un producto de la lista.';
      return;
    }
    if (this.cantidadAgregar < 1) {
      this.errorModal = 'La cantidad debe ser mayor a 0.';
      return;
    }
    if (this.cantidadAgregar > this.productoSeleccionado.stock) {
      this.errorModal = `Stock insuficiente. Disponible: ${this.productoSeleccionado.stock}`;
      return;
    }
    const existente = this.formularioVenta.detalles.find(
      d => d.productoId === this.productoSeleccionado!.id
    );
    if (existente) {
      const nuevaCantidad = existente.cantidad + this.cantidadAgregar;
      if (nuevaCantidad > this.productoSeleccionado.stock) {
        this.errorModal = 'Stock insuficiente para esa cantidad total.';
        return;
      }
      existente.cantidad = nuevaCantidad;
      existente.subtotal = existente.cantidad * existente.precioUnitario * (1 - existente.descuento / 100);
    } else {
      const detalle: DetalleVenta = {
        productoId:     this.productoSeleccionado.id!,
        nombreProducto: this.productoSeleccionado.nombre,
        cantidad:       this.cantidadAgregar,
        precioUnitario: this.productoSeleccionado.precioVenta,
        descuento:      0,
        subtotal:       this.cantidadAgregar * this.productoSeleccionado.precioVenta,
      };
      this.formularioVenta.detalles = [...this.formularioVenta.detalles, detalle];
    }
    this.recalcularTotales();
    this.busquedaProducto     = '';
    this.productoSeleccionado = null;
    this.productosFiltrados   = [];
    this.cantidadAgregar      = 1;
    this.errorModal           = '';
    this.cdr.markForCheck();
  }

  quitarDetalle(index: number): void {
    this.formularioVenta.detalles = this.formularioVenta.detalles.filter((_, i) => i !== index);
    this.recalcularTotales();
    this.cdr.markForCheck();
  }

  actualizarDescuento(index: number, descuento: number): void {
    const d = this.formularioVenta.detalles[index];
    d.descuento = Math.min(100, Math.max(0, descuento));
    d.subtotal  = d.cantidad * d.precioUnitario * (1 - d.descuento / 100);
    this.recalcularTotales();
    this.cdr.markForCheck();
  }

  recalcularTotales(): void {
    const subtotal  = this.formularioVenta.detalles.reduce((s, d) => s + d.subtotal, 0);
    const descuento = this.formularioVenta.detalles.reduce(
      (s, d) => s + (d.cantidad * d.precioUnitario * d.descuento / 100), 0
    );
    this.formularioVenta.subtotal  = subtotal;
    this.formularioVenta.descuento = descuento;
    this.formularioVenta.igv       = 0;
    this.formularioVenta.total     = subtotal;
  }

  async guardarVenta(): Promise<void> {
    if (!this.validarFormulario()) return;
    this.guardando  = true;
    this.errorModal = '';
    this.cdr.markForCheck();
    try {
      const venta: Venta = {
        numeroVenta:   this.formularioVenta.numeroVenta!,
        clienteId:     this.formularioVenta.clienteId,
        nombreCliente: this.formularioVenta.nombreCliente || 'Cliente general',
        usuarioId:     1,
        detalles:      this.formularioVenta.detalles,
        subtotal:      this.formularioVenta.subtotal!,
        descuento:     this.formularioVenta.descuento!,
        igv:           this.formularioVenta.igv!,
        total:         this.formularioVenta.total!,
        metodoPago:    this.formularioVenta.metodoPago!,
        estado:        'completada',
        fechaVenta:    new Date(),
        observaciones: this.formularioVenta.observaciones,
      };
      const nuevoId = await this.bd.agregar(this.bd.ALMACENES.VENTAS, venta);
      for (const d of venta.detalles) {
        await this.bd.actualizarStock(
          d.productoId, d.cantidad, 'salida',
          `Venta ${venta.numeroVenta}`, 1, venta.numeroVenta
        );
      }
      this.ventas    = [{ ...venta, id: nuevoId }, ...this.ventas];
      this.productos = (await this.bd.obtenerTodos<Producto>(this.bd.ALMACENES.PRODUCTOS)).filter(p => p.activo);
      this.filtrarVentas();
      this.mostrarToast('Venta registrada correctamente', 'exito');
      this.mostrarModal = false;
      this.cdr.markForCheck();
    } catch (e: any) {
      this.errorModal = e?.message?.includes('unique')
        ? 'El número de venta ya existe.'
        : 'Error al guardar la venta. Intenta de nuevo.';
      this.cdr.markForCheck();
    } finally {
      this.guardando = false;
      this.cdr.markForCheck();
    }
  }

  abrirDetalle(v: Venta): void {
    this.ventaDetalle        = v;
    this.mostrarModalDetalle = true;
    this.cdr.markForCheck();
  }

  cerrarDetalle(): void {
    this.mostrarModalDetalle = false;
    this.ventaDetalle        = null;
    this.cdr.markForCheck();
  }

  confirmarAnular(v: Venta): void {
    this.ventaAAnular       = v;
    this.mostrarModalAnular = true;
    this.cdr.markForCheck();
  }

  cerrarModalAnular(): void {
    if (this.guardando) return;
    this.mostrarModalAnular = false;
    this.ventaAAnular       = null;
    this.cdr.markForCheck();
  }

  async anularVenta(): Promise<void> {
    if (!this.ventaAAnular?.id) return;
    this.guardando = true;
    this.cdr.markForCheck();
    try {
      const actualizada = { ...this.ventaAAnular, estado: 'anulada' as const };
      await this.bd.actualizar(this.bd.ALMACENES.VENTAS, actualizada);
      for (const d of actualizada.detalles) {
        await this.bd.actualizarStock(
          d.productoId, d.cantidad, 'entrada',
          `Anulación ${actualizada.numeroVenta}`, 1, actualizada.numeroVenta
        );
      }
      const idx = this.ventas.findIndex(v => v.id === actualizada.id);
      if (idx !== -1) this.ventas[idx] = actualizada;
      this.productos = (await this.bd.obtenerTodos<Producto>(this.bd.ALMACENES.PRODUCTOS)).filter(p => p.activo);
      this.filtrarVentas();
      this.mostrarToast('Venta anulada correctamente', 'exito');
      this.cerrarModalAnular();
    } catch {
      this.mostrarToast('Error al anular la venta', 'error');
    } finally {
      this.guardando = false;
      this.cdr.markForCheck();
    }
  }

  seleccionarCliente(idStr: string): void {
    const id      = Number(idStr);
    const cliente = this.clientes.find(c => c.id === id);
    if (cliente) {
      this.formularioVenta.clienteId     = cliente.id;
      this.formularioVenta.nombreCliente = `${cliente.nombre} ${cliente.apellido}`;
    } else {
      this.formularioVenta.clienteId     = undefined;
      this.formularioVenta.nombreCliente = '';
    }
    this.cdr.markForCheck();
  }


  toggleFormCliente(): void {
    this.mostrarFormCliente = !this.mostrarFormCliente;
    if (!this.mostrarFormCliente) {
      this.nuevoCliente = this.clienteVacio();
      this.errorCliente = '';
    }
    this.cdr.markForCheck();
  }

  async guardarClienteRapido(): Promise<void> {
    if (!this.nuevoCliente.nombre?.trim()) {
      this.errorCliente = 'El nombre es obligatorio.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.nuevoCliente.documento?.trim()) {
      this.errorCliente = 'El documento es obligatorio.';
      this.cdr.markForCheck();
      return;
    }
    this.guardandoCliente = true;
    this.errorCliente     = '';
    this.cdr.markForCheck();
    try {
      const cliente: Cliente = {
        nombre:        this.nuevoCliente.nombre!.trim(),
        apellido:      this.nuevoCliente.apellido?.trim() ?? '',
        documento:     this.nuevoCliente.documento!.trim(),
        telefono:      this.nuevoCliente.telefono?.trim() ?? '',
        correo:        this.nuevoCliente.correo?.trim() ?? '',
        direccion:     this.nuevoCliente.direccion?.trim() ?? '',
        fechaRegistro: new Date(),
      };
      const nuevoId = await this.bd.agregar(this.bd.ALMACENES.CLIENTES, cliente);
      const clienteGuardado: Cliente = { ...cliente, id: nuevoId };
      this.clientes = [...this.clientes, clienteGuardado];

      this.formularioVenta.clienteId     = nuevoId;
      this.formularioVenta.nombreCliente = `${cliente.nombre} ${cliente.apellido}`;

      this.mostrarFormCliente = false;
      this.nuevoCliente       = this.clienteVacio();
      this.mostrarToast(`Cliente "${cliente.nombre} ${cliente.apellido}" creado y seleccionado`, 'exito');
      this.cdr.markForCheck();
    } catch (e: any) {
      this.errorCliente = e?.message?.includes('unique')
        ? 'Ya existe un cliente con ese documento.'
        : 'Error al guardar el cliente. Intenta de nuevo.';
      this.cdr.markForCheck();
    } finally {
      this.guardandoCliente = false;
      this.cdr.markForCheck();
    }
  }


  etiquetaMetodo(metodo: string): string {
    return this.METODOS_PAGO.find(m => m.value === metodo)?.label ?? metodo;
  }

  mostrarToast(mensaje: string, tipo: 'exito' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toastMensaje = mensaje;
    this.toastTipo    = tipo;
    this.toastVisible = true;
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.markForCheck();
    }, 3500);
  }

  cerrarToast(): void {
    clearTimeout(this.toastTimer);
    this.toastVisible = false;
    this.cdr.markForCheck();
  }

  private validarFormulario(): boolean {
    if (!this.formularioVenta.detalles.length) {
      this.errorModal = 'Agrega al menos un producto a la venta.';
      return false;
    }
    if (!this.formularioVenta.metodoPago) {
      this.errorModal = 'Selecciona un método de pago.';
      return false;
    }
    return true;
  }

  private formularioVacio(): Partial<Venta> & { detalles: DetalleVenta[] } {
    return {
      numeroVenta:   '',
      clienteId:     undefined,
      nombreCliente: '',
      detalles:      [],
      subtotal:      0,
      descuento:     0,
      igv:           0,
      total:         0,
      metodoPago:    'efectivo',
      observaciones: '',
    };
  }

  private clienteVacio(): Partial<Cliente> {
    return {
      nombre:    '',
      apellido:  '',
      documento: '',
      telefono:  '',
      correo:    '',
      direccion: '',
    };
  }
}