import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { BaseDatosService, Usuario } from '../../services/base-datos';
import { AutenticacionService }       from '../../services/autenticacion';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css'],
  
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent implements OnInit {

  
  todosLosUsuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];

  
  textoBusqueda  = '';
  filtroRol      = '';
  filtroEstado   = '';

  
  get totalUsuarios()    { return this.todosLosUsuarios.length; }
  get usuariosActivos()  { return this.todosLosUsuarios.filter(u => u.activo).length; }
  get usuariosInactivos(){ return this.todosLosUsuarios.filter(u => !u.activo).length; }

  
  cargando  = false;
  guardando = false;
  errorModal = '';

  
  mostrarModal    = false;
  usuarioEditando: Usuario | null = null;
  mostrarContrasena = false;

  formularioUsuario: Partial<Usuario> & { contrasena?: string } = this.formularioVacio();

  
  mostrarModalEliminar = false;
  usuarioAEliminar: Usuario | null = null;

  
  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'exito' | 'error' = 'exito';
  private toastTimer: any;

  
  get usuarioActual(): string {
    return this.auth.obtenerUsuarioActual()?.nombreUsuario ?? '';
  }

  constructor(
    public  location: Location,
    private bd:   BaseDatosService,
    private auth: AutenticacionService,
    private cdr:  ChangeDetectorRef,   
  ) {}

  
  
  

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  
  
  

  async cargarUsuarios(): Promise<void> {
    this.cargando = true;
    this.cdr.markForCheck(); 

    try {
      this.todosLosUsuarios = await this.bd.obtenerTodos<Usuario>(
        this.bd.ALMACENES.USUARIOS
      );
      this.filtrarUsuarios();
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      this.mostrarToast('Error al cargar usuarios', 'error');
    } finally {
      this.cargando = false;
      this.cdr.markForCheck(); 
    }
  }

  
  
  

  filtrarUsuarios(): void {
    const texto  = this.textoBusqueda.toLowerCase().trim();
    const rol    = this.filtroRol;
    const estado = this.filtroEstado;

    this.usuariosFiltrados = this.todosLosUsuarios.filter(u => {
      const coincideTexto =
        !texto ||
        u.nombreUsuario.toLowerCase().includes(texto) ||
        u.nombreCompleto.toLowerCase().includes(texto) ||
        u.correo.toLowerCase().includes(texto);

      const coincideRol    = !rol    || u.rol === rol;
      const coincideEstado = !estado ||
        (estado === 'activo' ? u.activo : !u.activo);

      return coincideTexto && coincideRol && coincideEstado;
    });

    
    this.cdr.markForCheck();
  }

  
  
  

  abrirModalCrear(): void {
    this.usuarioEditando    = null;
    this.formularioUsuario  = this.formularioVacio();
    this.errorModal         = '';
    this.mostrarContrasena  = false;
    this.mostrarModal       = true;
    this.cdr.markForCheck();
  }

  abrirModalEditar(usuario: Usuario): void {
    this.usuarioEditando = usuario;
    this.formularioUsuario = {
      nombreCompleto: usuario.nombreCompleto,
      nombreUsuario:  usuario.nombreUsuario,
      correo:         usuario.correo,
      rol:            usuario.rol,
      activo:         usuario.activo,
      contrasena:     '',   
    };
    this.errorModal        = '';
    this.mostrarContrasena = false;
    this.mostrarModal      = true;
    this.cdr.markForCheck();
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.mostrarModal = false;
    this.cdr.markForCheck();
  }

  async guardarUsuario(): Promise<void> {
    if (this.guardando) return;

    this.guardando  = true;
    this.errorModal = '';
    this.cdr.markForCheck(); 

    try {
      if (this.usuarioEditando) {
        await this.actualizarUsuario();
      } else {
        await this.crearUsuario();
      }
    } catch (err: any) {
      this.errorModal = err?.message ?? 'Ocurrió un error inesperado';
      this.cdr.markForCheck();
    } finally {
      this.guardando = false;
      this.cdr.markForCheck();
    }
  }

  private async crearUsuario(): Promise<void> {
    const { nombreUsuario, contrasena, nombreCompleto, correo, rol } =
      this.formularioUsuario;

    if (!nombreUsuario || !contrasena || !nombreCompleto || !correo || !rol) {
      throw new Error('Completá todos los campos obligatorios');
    }

    const nuevoUsuario: Usuario = {
      nombreUsuario,
      contrasena,
      nombreCompleto,
      correo,
      rol,
      activo:        true,
      fechaCreacion: new Date(),
    };

    await this.bd.agregar<Usuario>(this.bd.ALMACENES.USUARIOS, nuevoUsuario);

    this.mostrarModal = false;
    this.mostrarToast(`Usuario "${nombreCompleto}" creado correctamente`, 'exito');
    await this.cargarUsuarios();
  }

  private async actualizarUsuario(): Promise<void> {
    const usuario = this.usuarioEditando!;
    const { nombreCompleto, correo, rol, activo, contrasena } =
      this.formularioUsuario;

    const usuarioActualizado: Usuario = {
      ...usuario,
      nombreCompleto: nombreCompleto ?? usuario.nombreCompleto,
      correo:         correo         ?? usuario.correo,
      rol:            rol            ?? usuario.rol,
      activo:         activo         ?? usuario.activo,
      
      contrasena: contrasena?.trim()
        ? contrasena.trim()
        : usuario.contrasena,
    };

    await this.bd.actualizar<Usuario>(
      this.bd.ALMACENES.USUARIOS,
      usuarioActualizado
    );

    this.mostrarModal = false;
    this.mostrarToast(
      `Usuario "${usuarioActualizado.nombreCompleto}" actualizado`,
      'exito'
    );
    await this.cargarUsuarios();
  }

  
  
  

  async toggleEstado(usuario: Usuario): Promise<void> {
    
    usuario.activo = !usuario.activo;
    this.filtrarUsuarios(); 

    try {
      await this.bd.actualizar<Usuario>(this.bd.ALMACENES.USUARIOS, usuario);
      const estado = usuario.activo ? 'activado' : 'desactivado';
      this.mostrarToast(`Usuario ${estado} correctamente`, 'exito');
    } catch (err) {
      
      usuario.activo = !usuario.activo;
      this.filtrarUsuarios();
      this.mostrarToast('Error al cambiar el estado', 'error');
    }
  }

  
  
  

  confirmarEliminar(usuario: Usuario): void {
    this.usuarioAEliminar = usuario;
    this.mostrarModalEliminar = true;
    this.cdr.markForCheck();
  }

  cerrarModalEliminar(): void {
    if (this.guardando) return;
    this.mostrarModalEliminar = false;
    this.usuarioAEliminar     = null;
    this.cdr.markForCheck();
  }

  async eliminarUsuario(): Promise<void> {
    if (!this.usuarioAEliminar?.id || this.guardando) return;

    this.guardando = true;
    this.cdr.markForCheck();

    try {
      await this.bd.eliminar(
        this.bd.ALMACENES.USUARIOS,
        this.usuarioAEliminar.id
      );
      this.mostrarToast(
        `Usuario "${this.usuarioAEliminar.nombreCompleto}" eliminado`,
        'exito'
      );
      this.mostrarModalEliminar = false;
      this.usuarioAEliminar     = null;
      await this.cargarUsuarios();
    } catch (err) {
      this.mostrarToast('Error al eliminar el usuario', 'error');
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

  
  
  

  obtenerIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();
  }

  formatearRol(rol: string): string {
    return rol.charAt(0).toUpperCase() + rol.slice(1);
  }

  private formularioVacio(): Partial<Usuario> & { contrasena?: string } {
    return {
      nombreCompleto: '',
      nombreUsuario:  '',
      correo:         '',
      rol:            undefined,
      activo:         true,
      contrasena:     '',
    };
  }
}