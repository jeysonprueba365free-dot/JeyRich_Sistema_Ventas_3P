import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseDatosService, Proveedor } from '../../services/base-datos';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './provedores.html',
  styleUrls: ['./provedores.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProveedoresComponent implements OnInit {

  proveedores: Proveedor[]          = [];
  proveedoresFiltrados: Proveedor[] = [];

  textoBusqueda = '';
  filtroEstado  = '';

  get totalProveedores()    { return this.proveedores.length; }
  get proveedoresActivos()  { return this.proveedores.filter(p => p.activo).length; }
  get proveedoresInactivos(){ return this.proveedores.filter(p => !p.activo).length; }

  cargando             = false;
  guardando            = false;
  errorModal           = '';

  mostrarModal         = false;
  mostrarModalEliminar = false;
  proveedorEditando:  Proveedor | null = null;
  proveedorAEliminar: Proveedor | null = null;
  formularioProveedor: Proveedor = this.formularioVacio();

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
    this.cargarProveedores();
  }

  async cargarProveedores(): Promise<void> {
    this.cargando = true;
    this.cdr.markForCheck();
    try {
      this.proveedores = await this.bd.obtenerTodos<Proveedor>(
        this.bd.ALMACENES.PROVEEDORES
      );
      this.filtrarProveedores();
    } catch {
      this.mostrarToast('Error al cargar proveedores', 'error');
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  filtrarProveedores(): void {
    const texto = this.textoBusqueda.toLowerCase().trim();
    this.proveedoresFiltrados = this.proveedores.filter(p => {
      const coincideTexto = !texto ||
        p.nombre.toLowerCase().includes(texto)   ||
        p.ruc.toLowerCase().includes(texto)      ||
        p.contacto.toLowerCase().includes(texto) ||
        p.correo.toLowerCase().includes(texto)   ||
        p.telefono.toLowerCase().includes(texto);
      const coincideEstado =
        !this.filtroEstado ||
        (this.filtroEstado === 'activo'   &&  p.activo) ||
        (this.filtroEstado === 'inactivo' && !p.activo);
      return coincideTexto && coincideEstado;
    });
    this.cdr.markForCheck();
  }

  abrirModalCrear(): void {
    this.proveedorEditando   = null;
    this.formularioProveedor = this.formularioVacio();
    this.errorModal          = '';
    this.mostrarModal        = true;
    this.cdr.markForCheck();
  }

  abrirModalEditar(proveedor: Proveedor): void {
    this.proveedorEditando   = proveedor;
    this.formularioProveedor = { ...proveedor };
    this.errorModal          = '';
    this.mostrarModal        = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    this.mostrarModal      = false;
    this.proveedorEditando = null;
    this.errorModal        = '';
    this.cdr.markForCheck();
  }

  async guardarProveedor(): Promise<void> {
    if (!this.validarFormulario()) return;
    this.guardando  = true;
    this.errorModal = '';
    this.cdr.markForCheck();
    try {
      if (this.proveedorEditando) {
        const actualizado = { ...this.formularioProveedor, id: this.proveedorEditando.id };
        await this.bd.actualizar(this.bd.ALMACENES.PROVEEDORES, actualizado);
        const idx = this.proveedores.findIndex(p => p.id === actualizado.id);
        if (idx !== -1) this.proveedores[idx] = actualizado;
        this.mostrarToast('Proveedor actualizado correctamente', 'exito');
      } else {
        const nuevo: Proveedor = {
          ...this.formularioProveedor,
          activo: true,
          fechaRegistro: new Date()
        };
        const nuevoId = await this.bd.agregar(this.bd.ALMACENES.PROVEEDORES, nuevo);
        this.proveedores.push({ ...nuevo, id: nuevoId });
        this.mostrarToast('Proveedor creado correctamente', 'exito');
      }
      this.filtrarProveedores();
      // cierra el modal directamente sin pasar por cerrarModal()
      this.mostrarModal      = false;
      this.proveedorEditando = null;
      this.errorModal        = '';
      this.cdr.markForCheck();
    } catch (e: any) {
      if (e?.name === 'ConstraintError' || e?.message?.includes('unique')) {
        this.errorModal = 'El NIT ingresado ya está registrado.';
      } else {
        this.errorModal = 'Ocurrió un error al guardar. Intenta de nuevo.';
      }
      this.cdr.markForCheck();
    } finally {
      this.guardando = false;
      this.cdr.markForCheck();
    }
  }

  async toggleEstado(proveedor: Proveedor): Promise<void> {
    proveedor.activo = !proveedor.activo;
    this.filtrarProveedores();
    try {
      await this.bd.actualizar(this.bd.ALMACENES.PROVEEDORES, proveedor);
      const accion = proveedor.activo ? 'activado' : 'desactivado';
      this.mostrarToast(`Proveedor ${accion} correctamente`, 'exito');
    } catch {
      proveedor.activo = !proveedor.activo;
      this.filtrarProveedores();
      this.mostrarToast('Error al cambiar el estado', 'error');
    }
  }

  confirmarEliminar(proveedor: Proveedor): void {
    this.proveedorAEliminar   = proveedor;
    this.mostrarModalEliminar = true;
    this.cdr.markForCheck();
  }

  cerrarModalEliminar(): void {
    if (this.guardando) return;
    this.mostrarModalEliminar = false;
    this.proveedorAEliminar   = null;
    this.cdr.markForCheck();
  }

  async eliminarProveedor(): Promise<void> {
    if (!this.proveedorAEliminar?.id) return;
    this.guardando = true;
    this.cdr.markForCheck();
    try {
      await this.bd.eliminar(this.bd.ALMACENES.PROVEEDORES, this.proveedorAEliminar.id);
      this.proveedores = this.proveedores.filter(p => p.id !== this.proveedorAEliminar!.id);
      this.filtrarProveedores();
      this.mostrarToast('Proveedor eliminado correctamente', 'exito');
      this.cerrarModalEliminar();
    } catch {
      this.mostrarToast('Error al eliminar el proveedor', 'error');
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

  private validarFormulario(): boolean {
    const f = this.formularioProveedor;
    if (!f.nombre?.trim())   { this.errorModal = 'El nombre es obligatorio.';   return false; }
    if (!f.ruc?.trim())      { this.errorModal = 'El NIT es obligatorio.';      return false; }
    if (!f.telefono?.trim()) { this.errorModal = 'El teléfono es obligatorio.'; return false; }
    if (!f.contacto?.trim()) { this.errorModal = 'El contacto es obligatorio.'; return false; }
    if (f.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo)) {
      this.errorModal = 'El correo no tiene un formato válido.';
      return false;
    }
    this.cdr.markForCheck();
    return true;
  }

  private formularioVacio(): Proveedor {
    return {
      nombre: '', contacto: '', telefono: '',
      correo: '', direccion: '', ruc: '',
      activo: true, fechaRegistro: new Date()
    };
  }
}