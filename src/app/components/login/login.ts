import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AutenticacionService } from '../../services/autenticacion';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  credenciales = {
    nombreUsuario: '',
    contrasena: ''
  };
  cargando = false;
  mostrarContrasena = false;
  recordarme = false;
  mensajeError = '';
  mensajeExito = '';
  anioActual = new Date().getFullYear();
  constructor(
    private autenticacion: AutenticacionService,
    private router: Router
  ) {}
  ngOnInit(): void {
    if (this.autenticacion.estaAutenticado()) {
      this.router.navigate(['/dashboard']);
    }
    const usuarioRecordado = localStorage.getItem('jeyrich_recordar');
    if (usuarioRecordado) {
      this.credenciales.nombreUsuario = usuarioRecordado;
      this.recordarme = true;
    }
  }
  async onSubmit(): Promise<void> {
  this.mensajeError = '';
  this.mensajeExito = '';
  if (!this.credenciales.nombreUsuario || !this.credenciales.contrasena) {
    this.mensajeError = 'Completa todos los campos.';
    return;
  }
  this.cargando = true;
  try {
    const resultado = await this.autenticacion.iniciarSesion(
      this.credenciales.nombreUsuario.trim(),
      this.credenciales.contrasena
    );
    if (resultado.exito) {
      if (this.recordarme) {
        localStorage.setItem('jeyrich_recordar', this.credenciales.nombreUsuario.trim());
      } else {
        localStorage.removeItem('jeyrich_recordar');
      }
      this.mensajeExito = '¡Bienvenido! Redirigiendo...';
      setTimeout(() => this.router.navigate(['/dashboard']), 800);
    } else if (resultado.deshabilitado) {
      this.mensajeError = 'Tu usuario está deshabilitado. Contáctate con soporte.';
      this.credenciales.contrasena = '';
    } else {
      this.mensajeError = 'Usuario o contraseña incorrectos.';
      this.credenciales.contrasena = '';
    }
  } catch (error) {
    this.mensajeError = 'Error al conectar con la base de datos. Intenta de nuevo.';
  } finally {
    this.cargando = false;
  }
}
  toggleContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }
}