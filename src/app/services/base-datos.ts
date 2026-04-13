import { Injectable } from '@angular/core';

export interface Usuario {
  id?: number;
  nombreUsuario: string;
  contrasena: string;          
  nombreCompleto: string;
  correo: string;
  rol: 'administrador' | 'vendedor' | 'almacenero';
  activo: boolean;
  fechaCreacion: Date;
  ultimoAcceso?: Date;
}

export interface Proveedor {
  id?: number;
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
  direccion: string;
  ruc: string;
  activo: boolean;
  fechaRegistro: Date;
}

export interface Categoria {
  id?: number;
  nombre: string;
  descripcion: string;
}

export interface Producto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoriaId: number;
  proveedorId: number;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  unidad: string;             
  activo: boolean;
  fechaRegistro: Date;
}

export interface Cliente {
  id?: number;
  nombre: string;
  apellido: string;
  documento: string;
  telefono: string;
  correo: string;
  direccion: string;
  fechaRegistro: Date;
}

export interface DetalleVenta {
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface Venta {
  id?: number;
  numeroVenta: string;
  clienteId?: number;
  nombreCliente: string;
  usuarioId: number;
  detalles: DetalleVenta[];
  subtotal: number;
  descuento: number;
  igv: number;               
  total: number;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin';
  estado: 'completada' | 'anulada' | 'pendiente';
  fechaVenta: Date;
  observaciones?: string;
}

export interface MovimientoInventario {
  id?: number;
  productoId: number;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string;
  usuarioId: number;
  fecha: Date;
  referencia?: string;       
}

const NOMBRE_BD = 'JeyRichDB';
const VERSION_BD = 1;

@Injectable({
  providedIn: 'root'
})
export class BaseDatosService {

  private bd: IDBDatabase | null = null;
  private promesaConexion: Promise<IDBDatabase>;

  readonly ALMACENES = {
    USUARIOS:       'usuarios',
    PROVEEDORES:    'proveedores',
    CATEGORIAS:     'categorias',
    PRODUCTOS:      'productos',
    CLIENTES:       'clientes',
    VENTAS:         'ventas',
    MOVIMIENTOS:    'movimientosInventario',
  };

  constructor() {
    this.promesaConexion = this.inicializarBD();
  }

  private inicializarBD(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const solicitud = indexedDB.open(NOMBRE_BD, VERSION_BD);

      solicitud.onupgradeneeded = (evento: IDBVersionChangeEvent) => {
        const db = (evento.target as IDBOpenDBRequest).result;
        this.crearAlmacenes(db);
        this.insertarDatosIniciales(evento);
      };

      solicitud.onsuccess = (evento) => {
        this.bd = (evento.target as IDBOpenDBRequest).result;
        console.log('✅ JeyRichDB conectada correctamente');
        resolve(this.bd);
      };

      solicitud.onerror = (evento) => {
        console.error('❌ Error al abrir JeyRichDB:', (evento.target as IDBOpenDBRequest).error);
        reject((evento.target as IDBOpenDBRequest).error);
      };
    });
  }

  private crearAlmacenes(db: IDBDatabase): void {
    
    if (!db.objectStoreNames.contains(this.ALMACENES.USUARIOS)) {
      const almacenUsuarios = db.createObjectStore(this.ALMACENES.USUARIOS, {
        keyPath: 'id', autoIncrement: true
      });
      almacenUsuarios.createIndex('idx_nombreUsuario', 'nombreUsuario', { unique: true });
      almacenUsuarios.createIndex('idx_correo',        'correo',        { unique: true });
      almacenUsuarios.createIndex('idx_rol',           'rol',           { unique: false });
    }

    if (!db.objectStoreNames.contains(this.ALMACENES.PROVEEDORES)) {
      const almacenProveedores = db.createObjectStore(this.ALMACENES.PROVEEDORES, {
        keyPath: 'id', autoIncrement: true
      });
      almacenProveedores.createIndex('idx_ruc',    'ruc',    { unique: true });
      almacenProveedores.createIndex('idx_nombre', 'nombre', { unique: false });
    }

    
    if (!db.objectStoreNames.contains(this.ALMACENES.CATEGORIAS)) {
      const almacenCategorias = db.createObjectStore(this.ALMACENES.CATEGORIAS, {
        keyPath: 'id', autoIncrement: true
      });
      almacenCategorias.createIndex('idx_nombre', 'nombre', { unique: true });
    }

    if (!db.objectStoreNames.contains(this.ALMACENES.PRODUCTOS)) {
      const almacenProductos = db.createObjectStore(this.ALMACENES.PRODUCTOS, {
        keyPath: 'id', autoIncrement: true
      });
      almacenProductos.createIndex('idx_codigo',      'codigo',      { unique: true });
      almacenProductos.createIndex('idx_nombre',      'nombre',      { unique: false });
      almacenProductos.createIndex('idx_categoriaId', 'categoriaId', { unique: false });
      almacenProductos.createIndex('idx_proveedorId', 'proveedorId', { unique: false });
    }

    
    if (!db.objectStoreNames.contains(this.ALMACENES.CLIENTES)) {
      const almacenClientes = db.createObjectStore(this.ALMACENES.CLIENTES, {
        keyPath: 'id', autoIncrement: true
      });
      almacenClientes.createIndex('idx_documento', 'documento', { unique: true });
      almacenClientes.createIndex('idx_nombre',    'nombre',    { unique: false });
    }

    
    if (!db.objectStoreNames.contains(this.ALMACENES.VENTAS)) {
      const almacenVentas = db.createObjectStore(this.ALMACENES.VENTAS, {
        keyPath: 'id', autoIncrement: true
      });
      almacenVentas.createIndex('idx_numeroVenta', 'numeroVenta', { unique: true });
      almacenVentas.createIndex('idx_clienteId',   'clienteId',   { unique: false });
      almacenVentas.createIndex('idx_usuarioId',   'usuarioId',   { unique: false });
      almacenVentas.createIndex('idx_estado',      'estado',      { unique: false });
      almacenVentas.createIndex('idx_fechaVenta',  'fechaVenta',  { unique: false });
    }

    
    if (!db.objectStoreNames.contains(this.ALMACENES.MOVIMIENTOS)) {
      const almacenMovimientos = db.createObjectStore(this.ALMACENES.MOVIMIENTOS, {
        keyPath: 'id', autoIncrement: true
      });
      almacenMovimientos.createIndex('idx_productoId', 'productoId', { unique: false });
      almacenMovimientos.createIndex('idx_tipo',       'tipo',       { unique: false });
      almacenMovimientos.createIndex('idx_fecha',      'fecha',      { unique: false });
    }
  }

  private insertarDatosIniciales(evento: IDBVersionChangeEvent): void {
    const tx = (evento.target as IDBOpenDBRequest).transaction!;

    const storeUsuarios = tx.objectStore(this.ALMACENES.USUARIOS);
    const usuariosIniciales: Usuario[] = [
      {
        nombreUsuario:  'admin',
        contrasena:     'admin123',
        nombreCompleto: 'Administrador General',
        correo:         'admin@jeyrich.com',
        rol:            'administrador',
        activo:         true,
        fechaCreacion:  new Date(),
      },
      {
        nombreUsuario:  'jeyson',
        contrasena:     'jeyson123',
        nombreCompleto: 'Jeyson',
        correo:         'jeyson@jeyrich.com',
        rol:            'administrador',
        activo:         true,
        fechaCreacion:  new Date(),
      },
      {
        nombreUsuario:  'richard',
        contrasena:     'richard123',
        nombreCompleto: 'Richard',
        correo:         'richard@jeyrich.com',
        rol:            'administrador',
        activo:         true,
        fechaCreacion:  new Date(),
      },
      {
        nombreUsuario:  'sergio',
        contrasena:     'sergio123',
        nombreCompleto: 'Sergio',
        correo:         'sergio@jeyrich.com',
        rol:            'vendedor',
        activo:         true,
        fechaCreacion:  new Date(),
      },
    ];
    usuariosIniciales.forEach(u => storeUsuarios.add(u));

    const storeCategorias = tx.objectStore(this.ALMACENES.CATEGORIAS);
    const categoriasBase: Categoria[] = [
      { nombre: 'General',     descripcion: 'Productos generales' },
      { nombre: 'Alimentos',   descripcion: 'Productos alimenticios' },
      { nombre: 'Bebidas',     descripcion: 'Bebidas y líquidos' },
      { nombre: 'Limpieza',    descripcion: 'Productos de limpieza' },
      { nombre: 'Electrónica', descripcion: 'Dispositivos electrónicos' },
    ];
    categoriasBase.forEach(c => storeCategorias.add(c));
  }

  

  private async obtenerBD(): Promise<IDBDatabase> {
    if (this.bd) return this.bd;
    return this.promesaConexion;
  }

  async agregar<T>(nombreAlmacen: string, dato: T): Promise<number> {
    const db = await this.obtenerBD();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(nombreAlmacen, 'readwrite');
      const store = tx.objectStore(nombreAlmacen);
      const solicitud = store.add(dato);
      solicitud.onsuccess = () => resolve(solicitud.result as number);
      solicitud.onerror  = () => reject(solicitud.error);
    });
  }

  async actualizar<T>(nombreAlmacen: string, dato: T): Promise<void> {
    const db = await this.obtenerBD();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(nombreAlmacen, 'readwrite');
      const store = tx.objectStore(nombreAlmacen);
      const solicitud = store.put(dato);
      solicitud.onsuccess = () => resolve();
      solicitud.onerror  = () => reject(solicitud.error);
    });
  }

  async eliminar(nombreAlmacen: string, id: number): Promise<void> {
    const db = await this.obtenerBD();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(nombreAlmacen, 'readwrite');
      const store = tx.objectStore(nombreAlmacen);
      const solicitud = store.delete(id);
      solicitud.onsuccess = () => resolve();
      solicitud.onerror  = () => reject(solicitud.error);
    });
  }

  async obtenerPorId<T>(nombreAlmacen: string, id: number): Promise<T | undefined> {
    const db = await this.obtenerBD();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(nombreAlmacen, 'readonly');
      const store = tx.objectStore(nombreAlmacen);
      const solicitud = store.get(id);
      solicitud.onsuccess = () => resolve(solicitud.result as T);
      solicitud.onerror  = () => reject(solicitud.error);
    });
  }

  async obtenerTodos<T>(nombreAlmacen: string): Promise<T[]> {
    const db = await this.obtenerBD();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(nombreAlmacen, 'readonly');
      const store = tx.objectStore(nombreAlmacen);
      const solicitud = store.getAll();
      solicitud.onsuccess = () => resolve(solicitud.result as T[]);
      solicitud.onerror  = () => reject(solicitud.error);
    });
  }

  async obtenerPorIndice<T>(
    nombreAlmacen: string,
    nombreIndice: string,
    valor: IDBValidKey
  ): Promise<T[]> {
    const db = await this.obtenerBD();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(nombreAlmacen, 'readonly');
      const store = tx.objectStore(nombreAlmacen);
      const indice = store.index(nombreIndice);
      const solicitud = indice.getAll(valor);
      solicitud.onsuccess = () => resolve(solicitud.result as T[]);
      solicitud.onerror  = () => reject(solicitud.error);
    });
  }

  async contarRegistros(nombreAlmacen: string): Promise<number> {
    const db = await this.obtenerBD();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(nombreAlmacen, 'readonly');
      const store = tx.objectStore(nombreAlmacen);
      const solicitud = store.count();
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror  = () => reject(solicitud.error);
    });
  }

  async autenticarUsuario(
    nombreUsuario: string,
    contrasena: string
  ): Promise<Usuario | null> {
    const db = await this.obtenerBD();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.ALMACENES.USUARIOS, 'readonly');
      const store = tx.objectStore(this.ALMACENES.USUARIOS);
      const indice = store.index('idx_nombreUsuario');
      const solicitud = indice.get(nombreUsuario);

      solicitud.onsuccess = () => {
        const usuario = solicitud.result as Usuario;
        if (usuario && usuario.contrasena === contrasena && usuario.activo) {
          resolve(usuario);
        } else {
          resolve(null);
        }
      };
      solicitud.onerror = () => reject(solicitud.error);
    });
  }

  async actualizarUltimoAcceso(idUsuario: number): Promise<void> {
    const usuario = await this.obtenerPorId<Usuario>(
      this.ALMACENES.USUARIOS, idUsuario
    );
    if (usuario) {
      usuario.ultimoAcceso = new Date();
      await this.actualizar(this.ALMACENES.USUARIOS, usuario);
    }
  }

  async generarNumeroVenta(): Promise<string> {
    const total = await this.contarRegistros(this.ALMACENES.VENTAS);
    const ahora = new Date();
    const anio  = ahora.getFullYear();
    const mes   = String(ahora.getMonth() + 1).padStart(2, '0');
    const secuencia = String(total + 1).padStart(6, '0');
    return `VTA-${anio}${mes}-${secuencia}`;
  }

  async obtenerVentasPorFecha(desde: Date, hasta: Date): Promise<Venta[]> {
    const ventas = await this.obtenerTodos<Venta>(this.ALMACENES.VENTAS);
    return ventas.filter(v => {
      const fecha = new Date(v.fechaVenta);
      return fecha >= desde && fecha <= hasta;
    });
  }

  async obtenerProductosStockBajo(): Promise<Producto[]> {
    const productos = await this.obtenerTodos<Producto>(this.ALMACENES.PRODUCTOS);
    return productos.filter(p => p.activo && p.stock <= p.stockMinimo);
  }

  async actualizarStock(
    productoId: number,
    cantidad: number,
    tipo: 'entrada' | 'salida',
    motivo: string,
    usuarioId: number,
    referencia?: string
  ): Promise<void> {
    const producto = await this.obtenerPorId<Producto>(
      this.ALMACENES.PRODUCTOS, productoId
    );
    if (!producto) throw new Error('Producto no encontrado');

    if (tipo === 'entrada') {
      producto.stock += cantidad;
    } else {
      if (producto.stock < cantidad) throw new Error('Stock insuficiente');
      producto.stock -= cantidad;
    }

    await this.actualizar(this.ALMACENES.PRODUCTOS, producto);

    const movimiento: MovimientoInventario = {
      productoId,
      tipo,
      cantidad,
      motivo,
      usuarioId,
      fecha: new Date(),
      referencia,
    };
    await this.agregar(this.ALMACENES.MOVIMIENTOS, movimiento);
  }

  async obtenerResumenVentas(desde: Date, hasta: Date) {
    const ventas = await this.obtenerVentasPorFecha(desde, hasta);
    const ventasCompletadas = ventas.filter(v => v.estado === 'completada');

    return {
      totalVentas:    ventasCompletadas.length,
      totalIngresos:  ventasCompletadas.reduce((s, v) => s + v.total, 0),
      totalDescuentos:ventasCompletadas.reduce((s, v) => s + v.descuento, 0),
      ventaAnuladas:  ventas.filter(v => v.estado === 'anulada').length,
    };
  }

  async obtenerProductosMasVendidos(limite = 10): Promise<
    { productoId: number; nombre: string; totalVendido: number }[]
  > {
    const ventas = await this.obtenerTodos<Venta>(this.ALMACENES.VENTAS);
    const mapaProductos = new Map<number, { nombre: string; total: number }>();

    ventas
      .filter(v => v.estado === 'completada')
      .forEach(v =>
        v.detalles.forEach(d => {
          const actual = mapaProductos.get(d.productoId) ?? { nombre: d.nombreProducto, total: 0 };
          mapaProductos.set(d.productoId, {
            nombre: actual.nombre,
            total:  actual.total + d.cantidad,
          });
        })
      );

    return Array.from(mapaProductos.entries())
      .map(([productoId, { nombre, total }]) => ({
        productoId,
        nombre,
        totalVendido: total,
      }))
      .sort((a, b) => b.totalVendido - a.totalVendido)
      .slice(0, limite);
  }

  eliminarBaseDatos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bd?.close();
      const solicitud = indexedDB.deleteDatabase(NOMBRE_BD);
      solicitud.onsuccess = () => resolve();
      solicitud.onerror  = () => reject(solicitud.error);
    });
  }
}