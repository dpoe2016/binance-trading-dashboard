import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ChartComponent } from './components/chart/chart.component';
import { StrategyManagerComponent } from './components/strategy-manager/strategy-manager.component';
import { BacktestingComponent } from './components/backtesting/backtesting.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'chart', component: ChartComponent },
  { path: 'strategies', component: StrategyManagerComponent },
  { path: 'backtesting', component: BacktestingComponent }
];
