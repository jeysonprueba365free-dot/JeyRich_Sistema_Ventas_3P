import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AutenticacionService } from '../../services/autenticacion';
import { BaseDatosService } from '../../services/base-datos';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  barraColapsada   = false;
  seccionActiva    = 'dashboard';
  tituloPagina     = 'Dashboard';
  nombreUsuario    = '';
  rolUsuario       = '';
  iniciales        = '';
  esAdmin          = false;
  saludo           = '';
  fechaHoy         = '';
  totalVentasHoy   = 0;
  totalIngresosHoy = 0;
  totalProductos   = 0;
  alertasStock     = 0;
  constructor(
    private autenticacion: AutenticacionService,
    private bd: BaseDatosService,
    private router: Router
  ) {}
  ngOnInit(): void {
    if (!this.autenticacion.estaAutenticado()) {
      this.router.navigate(['/login']);
      return;
    }
    this.cargarDatosUsuario();
    this.configurarFecha();
    this.cargarMetricas();
  }
  private cargarDatosUsuario(): void {
    const usuario = this.autenticacion.obtenerUsuarioActual();
    if (!usuario) return;
    this.nombreUsuario = usuario.nombreCompleto;
    this.rolUsuario    = usuario.rol;
    this.esAdmin       = usuario.rol === 'administrador';
    const partes = usuario.nombreCompleto.trim().split(' ');
    this.iniciales = partes.length >= 2
      ? (partes[0][0] + partes[1][0]).toUpperCase()
      : partes[0].substring(0, 2).toUpperCase();
  }
  private configurarFecha(): void {
    const ahora = new Date();
    const hora  = ahora.getHours();
    if (hora >= 5  && hora < 12) this.saludo = 'Buenos días';
    else if (hora >= 12 && hora < 19) this.saludo = 'Buenas tardes';
    else this.saludo = 'Buenas noches';
    this.fechaHoy = ahora.toLocaleDateString('es-BO', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric'
    });
  }
  private async cargarMetricas(): Promise<void> {
    try {
      const hoy   = new Date();
      const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
      const resumen   = await this.bd.obtenerResumenVentas(desde, hasta);
      const productos = await this.bd.obtenerProductosStockBajo();
      const todosProductos = await this.bd.obtenerTodos<any>(this.bd.ALMACENES.PRODUCTOS);
      this.totalVentasHoy   = resumen.totalVentas;
      this.totalIngresosHoy = resumen.totalIngresos;
      this.totalProductos   = todosProductos.filter((p: any) => p.activo).length;
      this.alertasStock     = productos.length;
    } catch (error) {
      console.error('Error al cargar métricas:', error);
    }
  }
  toggleBarra(): void {
    this.barraColapsada = !this.barraColapsada;
  }
  navegarA(seccion: string): void {
    this.seccionActiva = seccion;
    const rutas: Record<string, string> = {
      dashboard:   '/dashboard',
      ventas:      '/ventas',
      productos:   '/productos',
      proveedores: '/proveedores',
      usuarios:    '/usuarios',
      reportes:    '/reportes',
    };
    this.tituloPagina = seccion.charAt(0).toUpperCase() + seccion.slice(1);
    this.router.navigate([rutas[seccion] ?? '/dashboard']);
  }
  cerrarSesion(): void {
    this.autenticacion.cerrarSesion();
  }
}