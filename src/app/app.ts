import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Gasul } from "./gasul/gasul";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('gasul-management-system-sample-draft');
}
