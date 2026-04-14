import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseDatosService, Usuario } from '../../services/base-datos';
import { AutenticacionService } from '../../services/autenticacion';
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class UsuariosComponent implements OnInit, OnDestroy {
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  cargando  = false;
  guardando = false;
  textoBusqueda = '';
  filtroRol     = '';
  filtroEstado  = '';
  mostrarModal         = false;
  mostrarModalEliminar = false;
  mostrarContrasena    = false;
  usuarioEditando:  Usuario | null = null;
  usuarioAEliminar: Usuario | null = null;
  formularioUsuario: Partial<Usuario> & { contrasena: string } = this.formularioVacio();
  errorModal = '';
  exitoModal = '';
  usuarioActual = '';
  toastVisible  = false;
  toastMensaje  = '';
  toastTipo: 'exito' | 'error' = 'exito';
  private toastTimer: any;
  constructor(
    private bd: BaseDatosService,
    private autenticacion: AutenticacionService,
    private ngZone: NgZone,
    public location: Location
  ) {}
  ngOnInit(): void {
    const sesion = this.autenticacion.obtenerUsuarioActual();
    if (sesion) this.usuarioActual = sesion.nombreUsuario;
    this.cargarUsuarios();
  }
  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
  }
  get totalUsuarios()    { return this.usuarios.length; }
  get usuariosActivos()  { return this.usuarios.filter(u => u.activo).length; }
  get usuariosInactivos(){ return this.usuarios.filter(u => !u.activo).length; }
  mostrarToast(mensaje: string, tipo: 'exito' | 'error' = 'exito'): void {
    clearTimeout(this.toastTimer);
    this.toastMensaje = mensaje;
    this.toastTipo    = tipo;
    this.toastVisible = true;
    this.toastTimer   = setTimeout(() => { this.toastVisible = false; }, 4000);
  }
  cerrarToast(): void {
    clearTimeout(this.toastTimer);
    this.toastVisible = false;
  }
  async cargarUsuarios(): Promise<void> {
    this.cargando = true;
    try {
      this.usuarios = await this.bd.obtenerTodos<Usuario>(this.bd.ALMACENES.USUARIOS);
      this.filtrarUsuarios();
    } catch (e) {
      console.error('Error al cargar usuarios:', e);
    } finally {
      this.cargando = false;
    }
  }
  filtrarUsuarios(): void {
    const texto = this.textoBusqueda.toLowerCase().trim();
    this.usuariosFiltrados = this.usuarios.filter(u => {
      const coincideTexto = !texto ||
        u.nombreCompleto.toLowerCase().includes(texto) ||
        u.nombreUsuario.toLowerCase().includes(texto)  ||
        u.correo.toLowerCase().includes(texto);
      const coincideRol    = !this.filtroRol    || u.rol === this.filtroRol;
      const coincideEstado = !this.filtroEstado ||
        (this.filtroEstado === 'activo' ? u.activo : !u.activo);
      return coincideTexto && coincideRol && coincideEstado;
    });
  }
  abrirModalCrear(): void {
    this.usuarioEditando  = null;
    this.formularioUsuario = this.formularioVacio();
    this.limpiarAlertas();
    this.mostrarModal = true;
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
    this.limpiarAlertas();
    this.mostrarModal = true;
  }
  confirmarEliminar(usuario: Usuario): void {
    this.usuarioAEliminar = usuario;
    this.mostrarModalEliminar = true;
  }
  cerrarModal(): void {
    this.mostrarModal      = false;
    this.usuarioEditando   = null;
    this.mostrarContrasena = false;
    this.guardando         = false;
    this.errorModal        = '';
    this.exitoModal        = '';
  }
  cerrarModalEliminar(): void {
    this.mostrarModalEliminar = false;
    this.usuarioAEliminar     = null;
    this.guardando            = false;
  }
  guardarUsuario(): void {
    this.errorModal = '';
    this.exitoModal = '';
    this.guardando  = true;
    this.ngZone.runOutsideAngular(async () => {
      try {
        if (this.usuarioEditando) {
          const actualizado: Usuario = {
            ...this.usuarioEditando,
            nombreCompleto: this.formularioUsuario.nombreCompleto!,
            correo:         this.formularioUsuario.correo!,
            rol:            this.formularioUsuario.rol!,
            activo:         this.formularioUsuario.activo!,
          };
          if (this.formularioUsuario.contrasena?.trim()) {
            actualizado.contrasena = this.formularioUsuario.contrasena.trim();
          }
          await this.bd.actualizar(this.bd.ALMACENES.USUARIOS, actualizado);
          await this.bd.obtenerTodos<Usuario>(this.bd.ALMACENES.USUARIOS).then(lista => {
            this.ngZone.run(() => {
              this.usuarios = lista;
              this.filtrarUsuarios();
              this.guardando = false;
              this.mostrarToast('Usuario actualizado correctamente ✓');
              this.cerrarModal();
            });
          });
        } else {
          const existe = this.usuarios.find(
            u => u.nombreUsuario === this.formularioUsuario.nombreUsuario?.trim()
          );
          if (existe) {
            this.ngZone.run(() => {
              this.guardando  = false;
              this.errorModal = 'Ya existe un usuario con ese nombre de usuario.';
            });
            return;
          }
          const nuevoUsuario: Usuario = {
            nombreUsuario:  this.formularioUsuario.nombreUsuario!.trim(),
            contrasena:     this.formularioUsuario.contrasena!.trim(),
            nombreCompleto: this.formularioUsuario.nombreCompleto!.trim(),
            correo:         this.formularioUsuario.correo!.trim(),
            rol:            this.formularioUsuario.rol!,
            activo:         true,
            fechaCreacion:  new Date(),
          };
          await this.bd.agregar(this.bd.ALMACENES.USUARIOS, nuevoUsuario);
          await this.bd.obtenerTodos<Usuario>(this.bd.ALMACENES.USUARIOS).then(lista => {
            this.ngZone.run(() => {
              this.usuarios = lista;
              this.filtrarUsuarios();
              this.guardando = false;
              this.mostrarToast('Usuario creado correctamente ✓');
              this.cerrarModal();
            });
          });
        }
      } catch (e: any) {
        console.error('Error al guardar usuario:', e);
        this.ngZone.run(() => {
          this.guardando  = false;
          if (e?.name === 'ConstraintError') {
            this.errorModal = 'El correo o usuario ya está registrado.';
          } else {
            this.errorModal = 'Error al guardar el usuario. Intenta de nuevo.';
          }
        });
      }
    });
  }
  toggleEstado(usuario: Usuario): void {
    if (usuario.nombreUsuario === this.usuarioActual) return;
    this.ngZone.runOutsideAngular(async () => {
      try {
        const actualizado = { ...usuario, activo: !usuario.activo };
        await this.bd.actualizar(this.bd.ALMACENES.USUARIOS, actualizado);
        const lista = await this.bd.obtenerTodos<Usuario>(this.bd.ALMACENES.USUARIOS);
        this.ngZone.run(() => {
          this.usuarios = lista;
          this.filtrarUsuarios();
          this.mostrarToast(
            actualizado.activo
              ? `${usuario.nombreCompleto} fue activado ✓`
              : `${usuario.nombreCompleto} fue desactivado`
          );
        });
      } catch (e) {
        console.error('Error al cambiar estado:', e);
        this.ngZone.run(() => {
          this.mostrarToast('Error al cambiar el estado del usuario', 'error');
        });
      }
    });
  }
  eliminarUsuario(): void {
    if (!this.usuarioAEliminar?.id) return;
    this.guardando = true;
    const nombre = this.usuarioAEliminar.nombreCompleto;
    const id     = this.usuarioAEliminar.id;
    this.ngZone.runOutsideAngular(async () => {
      try {
        await this.bd.eliminar(this.bd.ALMACENES.USUARIOS, id);
        const lista = await this.bd.obtenerTodos<Usuario>(this.bd.ALMACENES.USUARIOS);
        this.ngZone.run(() => {
          this.usuarios = lista;
          this.filtrarUsuarios();
          this.guardando = false;
          this.cerrarModalEliminar();
          this.mostrarToast(`${nombre} fue eliminado correctamente`);
        });
      } catch (e) {
        console.error('Error al eliminar:', e);
        this.ngZone.run(() => {
          this.guardando = false;
          this.cerrarModalEliminar();
          this.mostrarToast('Error al eliminar el usuario', 'error');
        });
      }
    });
  }
  obtenerIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase() ?? '')
      .join('');
  }
  formatearRol(rol: string): string {
    const mapa: Record<string, string> = {
      administrador: 'Administrador',
      vendedor:      'Vendedor',
      almacenero:    'Almacenero',
    };
    return mapa[rol] ?? rol;
  }
  private formularioVacio() {
    return {
      nombreCompleto: '',
      nombreUsuario:  '',
      correo:         '',
      rol:            '' as any,
      activo:         true,
      contrasena:     '',
    };
  }
  private limpiarAlertas(): void {
    this.errorModal = '';
    this.exitoModal = '';
  }
}