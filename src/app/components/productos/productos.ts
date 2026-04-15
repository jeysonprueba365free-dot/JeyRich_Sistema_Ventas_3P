import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import {
  BaseDatosService,
  Producto,
  Categoria,
  Proveedor,
} from '../../services/base-datos';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosComponent implements OnInit {

  
  todosLosProductos: Producto[]  = [];
  productosFiltrados: Producto[] = [];
  categorias: Categoria[]        = [];
  proveedores: Proveedor[]       = [];

  
  textoBusqueda   = '';
  filtroCategoria = '';
  filtroEstado    = '';

  
  get totalProductos()   { return this.todosLosProductos.length; }
  get productosActivos() { return this.todosLosProductos.filter(p => p.activo).length; }
  get stockBajo()        { return this.todosLosProductos.filter(p => p.activo && p.stock <= p.stockMinimo).length; }

  
  cargando   = false;
  guardando  = false;
  errorModal = '';

  
  mostrarModal     = false;
  productoEditando: Producto | null = null;
  formularioProducto: Partial<Producto> = this.formularioVacio();

  
  mostrarModalEliminar = false;
  productoAEliminar: Producto | null = null;

  
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
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando = true;
    this.cdr.markForCheck();
    try {
      const [productos, categorias, proveedores] = await Promise.all([
        this.bd.obtenerTodos<Producto>(this.bd.ALMACENES.PRODUCTOS),
        this.bd.obtenerTodos<Categoria>(this.bd.ALMACENES.CATEGORIAS),
        this.bd.obtenerTodos<Proveedor>(this.bd.ALMACENES.PROVEEDORES),
      ]);
      this.todosLosProductos = productos;
      this.categorias        = categorias;
      this.proveedores       = proveedores;
      this.filtrarProductos();
    } catch (err) {
      this.mostrarToast('Error al cargar productos', 'error');
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  async alCambiarCategoria(): Promise<void> {
    
    if (this.productoEditando) return;

    const catId = Number(this.formularioProducto.categoriaId);
    if (!catId) return;

    const prefijo = this.obtenerPrefijo(catId);
    const correlativo = await this.calcularCorrelativo(catId);
    this.formularioProducto.codigo = `${prefijo}-${String(correlativo).padStart(3, '0')}`;
    this.cdr.markForCheck();
  }

  private obtenerPrefijo(categoriaId: number): string {
    const categoria = this.categorias.find(c => c.id === categoriaId);
    if (!categoria) return 'PRD';

    
    const nombre = categoria.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   
      .replace(/[^a-zA-Z]/g, '');        
    return nombre.substring(0, 3).toUpperCase();
  }

  private async calcularCorrelativo(categoriaId: number): Promise<number> {
    const productosDeCategoria = this.todosLosProductos.filter(
      p => p.categoriaId === categoriaId
    );
    return productosDeCategoria.length + 1;
  }

  filtrarProductos(): void {
    const texto  = this.textoBusqueda.toLowerCase().trim();
    const catId  = this.filtroCategoria ? Number(this.filtroCategoria) : null;
    const estado = this.filtroEstado;

    this.productosFiltrados = this.todosLosProductos.filter(p => {
      const coincideTexto =
        !texto ||
        p.nombre.toLowerCase().includes(texto)      ||
        p.codigo.toLowerCase().includes(texto)      ||
        p.descripcion.toLowerCase().includes(texto);
      const coincideCategoria = !catId  || p.categoriaId === catId;
      const coincideEstado    = !estado ||
        (estado === 'activo' ? p.activo : !p.activo);
      return coincideTexto && coincideCategoria && coincideEstado;
    });
    this.cdr.markForCheck();
  }

  nombreCategoria(id: number): string {
    return this.categorias.find(c => c.id === id)?.nombre ?? '—';
  }

  nombreProveedor(id: number): string {
    return this.proveedores.find(p => p.id === id)?.nombre ?? '—';
  }

  esStockBajo(p: Producto): boolean {
    return p.activo && p.stock <= p.stockMinimo;
  }

  abrirModalCrear(): void {
    this.productoEditando   = null;
    this.formularioProducto = this.formularioVacio();
    this.errorModal         = '';
    this.mostrarModal       = true;
    this.cdr.markForCheck();
  }

  abrirModalEditar(producto: Producto): void {
    this.productoEditando   = producto;
    this.formularioProducto = { ...producto };
    this.errorModal         = '';
    this.mostrarModal       = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.mostrarModal = false;
    this.cdr.markForCheck();
  }

  async guardarProducto(): Promise<void> {
    if (this.guardando) return;
    this.guardando  = true;
    this.errorModal = '';
    this.cdr.markForCheck();
    try {
      if (this.productoEditando) {
        await this.actualizarProducto();
      } else {
        await this.crearProducto();
      }
    } catch (err: any) {
      this.errorModal = err?.message ?? 'Error inesperado';
      this.cdr.markForCheck();
    } finally {
      this.guardando = false;
      this.cdr.markForCheck();
    }
  }

  private async crearProducto(): Promise<void> {
    const f = this.formularioProducto;
    if (!f.codigo || !f.nombre || !f.categoriaId || !f.proveedorId) {
      throw new Error('Completá todos los campos obligatorios');
    }
    const nuevo: Producto = {
      codigo:        f.codigo!,
      nombre:        f.nombre!,
      descripcion:   f.descripcion ?? '',
      categoriaId:   Number(f.categoriaId),
      proveedorId:   Number(f.proveedorId),
      precioCompra:  Number(f.precioCompra  ?? 0),
      precioVenta:   Number(f.precioVenta   ?? 0),
      stock:         Number(f.stock         ?? 0),
      stockMinimo:   Number(f.stockMinimo   ?? 5),
      unidad:        f.unidad ?? 'unidad',
      activo:        true,
      fechaRegistro: new Date(),
    };
    await this.bd.agregar<Producto>(this.bd.ALMACENES.PRODUCTOS, nuevo);
    this.mostrarModal = false;
    this.mostrarToast(`Producto "${nuevo.nombre}" creado correctamente`, 'exito');
    await this.cargarDatos();
  }

  private async actualizarProducto(): Promise<void> {
    const f = this.formularioProducto;
    const actualizado: Producto = {
      ...this.productoEditando!,
      codigo:       f.codigo!,
      nombre:       f.nombre!,
      descripcion:  f.descripcion ?? '',
      categoriaId:  Number(f.categoriaId),
      proveedorId:  Number(f.proveedorId),
      precioCompra: Number(f.precioCompra ?? 0),
      precioVenta:  Number(f.precioVenta  ?? 0),
      stock:        Number(f.stock        ?? 0),
      stockMinimo:  Number(f.stockMinimo  ?? 5),
      unidad:       f.unidad ?? 'unidad',
      activo:       f.activo ?? true,
    };
    await this.bd.actualizar<Producto>(this.bd.ALMACENES.PRODUCTOS, actualizado);
    this.mostrarModal = false;
    this.mostrarToast(`Producto "${actualizado.nombre}" actualizado`, 'exito');
    await this.cargarDatos();
  }

  async toggleEstado(producto: Producto): Promise<void> {
    producto.activo = !producto.activo;
    this.filtrarProductos();
    try {
      await this.bd.actualizar<Producto>(this.bd.ALMACENES.PRODUCTOS, producto);
      this.mostrarToast(`Producto ${producto.activo ? 'activado' : 'desactivado'}`, 'exito');
    } catch {
      producto.activo = !producto.activo;
      this.filtrarProductos();
      this.mostrarToast('Error al cambiar estado', 'error');
    }
  }

  confirmarEliminar(producto: Producto): void {
    this.productoAEliminar    = producto;
    this.mostrarModalEliminar = true;
    this.cdr.markForCheck();
  }

  cerrarModalEliminar(): void {
    if (this.guardando) return;
    this.mostrarModalEliminar = false;
    this.productoAEliminar    = null;
    this.cdr.markForCheck();
  }

  async eliminarProducto(): Promise<void> {
    if (!this.productoAEliminar?.id || this.guardando) return;
    this.guardando = true;
    this.cdr.markForCheck();
    try {
      await this.bd.eliminar(this.bd.ALMACENES.PRODUCTOS, this.productoAEliminar.id);
      this.mostrarToast(`Producto "${this.productoAEliminar.nombre}" eliminado`, 'exito');
      this.mostrarModalEliminar = false;
      this.productoAEliminar    = null;
      await this.cargarDatos();
    } catch {
      this.mostrarToast('Error al eliminar el producto', 'error');
    } finally {
      this.guardando = false;
      this.cdr.markForCheck();
    }
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

  private formularioVacio(): Partial<Producto> {
    return {
      codigo: '', nombre: '', descripcion: '',
      categoriaId: undefined, proveedorId: undefined,
      precioCompra: 0, precioVenta: 0,
      stock: 0, stockMinimo: 5,
      unidad: 'unidad', activo: true,
    };
  }
}