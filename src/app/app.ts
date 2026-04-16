import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Proveedor } from './services/base-datos';
import { ProveedoresComponent } from './components/provedores/provedores';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Ventas_v1');
}
declarations: [
  ProveedoresComponent
]