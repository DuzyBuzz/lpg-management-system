import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-branch-sales',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './branch-sales.html',
  styleUrls: ['./branch-sales.scss']
})
export class BranchSales {}
