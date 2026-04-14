import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BaseDatosService, Usuario } from './base-datos';
const CLAVE_SESION = 'jeyrich_sesion';
@Injectable({
  providedIn: 'root'
})
export class AutenticacionService {
  private usuarioActual: Usuario | null = null;
  constructor(
    private bd: BaseDatosService,
    private router: Router
  ) {
    const sesionGuardada = sessionStorage.getItem(CLAVE_SESION);
    if (sesionGuardada) {
      this.usuarioActual = JSON.parse(sesionGuardada);
    }
  }
  async iniciarSesion(nombreUsuario: string, contrasena: string): Promise<boolean> {
    const usuario = await this.bd.autenticarUsuario(nombreUsuario, contrasena);
    if (usuario) {
      this.usuarioActual = usuario;
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
      if (usuario.id) {
        await this.bd.actualizarUltimoAcceso(usuario.id);
      }
      return true;
    }
    return false;
  }
  cerrarSesion(): void {
    this.usuarioActual = null;
    sessionStorage.removeItem(CLAVE_SESION);
    this.router.navigate(['/login']);
  }
  estaAutenticado(): boolean {
    return this.usuarioActual !== null;
  }
  obtenerUsuarioActual(): Usuario | null {
    return this.usuarioActual;
  }
  esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'administrador';
  }
  tieneRol(rol: string): boolean {
    return this.usuarioActual?.rol === rol;
  }
}