import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ModalAuthComponent } from './composants/modal-auth/modal-auth.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalAuthComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('kasa_v1');
}
