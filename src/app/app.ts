import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ToolboxService } from './core/services/toolbox';
import { SITE_CONFIG } from './constants/constant';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public toolbox = inject(ToolboxService);
  public siteName = SITE_CONFIG.name;
  
  public get year(): number {
    return new Date().getFullYear();
  }

  public get favoritesCount(): number {
    return this.toolbox.favorites().length;
  }
}
