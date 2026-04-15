import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';
import { UsuariosComponent } from './components/usuarios/usuarios';
import { ProductosComponent } from './components/productos/productos';
export const routes: Routes = [
  { path: '',          redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',     component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'usuarios',  component: UsuariosComponent },
  { path: 'productos', component: ProductosComponent },
  { path: '**',        redirectTo: 'login' }
];