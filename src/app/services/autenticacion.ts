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
  async iniciarSesion(nombreUsuario: string, contrasena: string): Promise<{ exito: boolean, deshabilitado?: boolean }> {
  const resultado = await this.bd.autenticarUsuario(nombreUsuario, contrasena);
  if (resultado.usuario) {
    this.usuarioActual = resultado.usuario;
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(resultado.usuario));
    if (resultado.usuario.id) {
      await this.bd.actualizarUltimoAcceso(resultado.usuario.id);
    }
    return { exito: true };
  }
  return { exito: false, deshabilitado: resultado.deshabilitado };
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