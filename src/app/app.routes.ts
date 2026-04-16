import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';
import { UsuariosComponent } from './components/usuarios/usuarios';
import { ProductosComponent } from './components/productos/productos';
import { Proveedor } from './services/base-datos';
import { ProveedoresComponent } from './components/provedores/provedores';
import { VentasComponent } from './components/ventas/ventas';

export const routes: Routes = [
  { path: '',          redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',     component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'usuarios',  component: UsuariosComponent },
  { path: 'productos', component: ProductosComponent },
  { path: 'provedores', component: ProveedoresComponent },
  { path: 'ventas',     component: VentasComponent },
  { path: '**',        redirectTo: 'login' }
];