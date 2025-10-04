import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ChartComponent } from './components/chart/chart.component';
import { StrategyManagerComponent } from './components/strategy-manager/strategy-manager.component';
import { BacktestingComponent } from './components/backtesting/backtesting.component';
import { AlertsComponent } from './components/alerts/alerts.component';
import { EmailConfigComponent } from './components/email-config/email-config.component';
import { WebhookConfigComponent } from './components/webhook-config/webhook-config.component';
import { OrderHistoryComponent } from './components/order-history/order-history.component';
import { PositionManagementComponent } from './components/position-management/position-management.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'chart', component: ChartComponent },
  { path: 'strategies', component: StrategyManagerComponent },
  { path: 'backtesting', component: BacktestingComponent },
  { path: 'alerts', component: AlertsComponent },
  { path: 'orders/history', component: OrderHistoryComponent },
  { path: 'positions', component: PositionManagementComponent },
  { path: 'settings/email', component: EmailConfigComponent },
  { path: 'settings/webhooks', component: WebhookConfigComponent }
];
