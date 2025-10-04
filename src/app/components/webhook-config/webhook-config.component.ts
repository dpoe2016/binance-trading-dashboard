import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebhookService } from '../../services/webhook.service';
import {
  WebhookConfig,
  WebhookPlatform,
  WebhookEvent,
  WebhookLog
} from '../../models/webhook-config.model';

@Component({
  selector: 'app-webhook-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './webhook-config.component.html',
  styleUrls: ['./webhook-config.component.scss']
})
export class WebhookConfigComponent implements OnInit, OnDestroy {
  webhooks: WebhookConfig[] = [];
  logs: WebhookLog[] = [];
  webhookForm!: FormGroup;
  editingWebhook: WebhookConfig | null = null;
  showForm: boolean = false;
  showLogs: boolean = false;
  testingWebhookId: string | null = null;

  platforms = Object.values(WebhookPlatform);
  events = Object.values(WebhookEvent);

  platformLabels: { [key in WebhookPlatform]: string } = {
    [WebhookPlatform.DISCORD]: 'Discord',
    [WebhookPlatform.TELEGRAM]: 'Telegram',
    [WebhookPlatform.SLACK]: 'Slack',
    [WebhookPlatform.CUSTOM]: 'Custom'
  };

  eventLabels: { [key in WebhookEvent]: string } = {
    [WebhookEvent.ALERT_TRIGGERED]: 'Alert Triggered',
    [WebhookEvent.ORDER_FILLED]: 'Order Filled',
    [WebhookEvent.POSITION_OPENED]: 'Position Opened',
    [WebhookEvent.POSITION_CLOSED]: 'Position Closed',
    [WebhookEvent.STOP_LOSS_HIT]: 'Stop Loss Hit',
    [WebhookEvent.TAKE_PROFIT_HIT]: 'Take Profit Hit',
    [WebhookEvent.RISK_WARNING]: 'Risk Warning',
    [WebhookEvent.VOLATILITY_ALERT]: 'Volatility Alert'
  };

  platformPlaceholders: { [key in WebhookPlatform]: string } = {
    [WebhookPlatform.DISCORD]: 'https://discord.com/api/webhooks/...',
    [WebhookPlatform.TELEGRAM]: 'https://api.telegram.org/bot<token>/sendMessage?chat_id=<chat_id>',
    [WebhookPlatform.SLACK]: 'https://hooks.slack.com/services/...',
    [WebhookPlatform.CUSTOM]: 'https://your-api.com/webhook'
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private webhookService: WebhookService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadWebhooks();
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initForm(): void {
    this.webhookForm = this.fb.group({
      name: ['', Validators.required],
      enabled: [true],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      platform: [WebhookPlatform.DISCORD, Validators.required],
      events: this.fb.array(this.events.map(() => this.fb.control(true))),
      customPayload: [''],
      retryAttempts: [3, [Validators.required, Validators.min(0), Validators.max(10)]],
      timeout: [5000, [Validators.required, Validators.min(1000), Validators.max(30000)]]
    });
  }

  private loadWebhooks(): void {
    this.subscriptions.push(
      this.webhookService.getWebhooks().subscribe(webhooks => {
        this.webhooks = webhooks;
      })
    );
  }

  private loadLogs(): void {
    this.subscriptions.push(
      this.webhookService.getLogs().subscribe(logs => {
        this.logs = logs.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      })
    );
  }

  get eventsFormArray(): FormArray {
    return this.webhookForm.get('events') as FormArray;
  }

  get selectedPlatform(): WebhookPlatform {
    return this.webhookForm.get('platform')?.value;
  }

  get urlPlaceholder(): string {
    return this.platformPlaceholders[this.selectedPlatform];
  }

  showAddForm(): void {
    this.editingWebhook = null;
    this.webhookForm.reset({
      enabled: true,
      platform: WebhookPlatform.DISCORD,
      retryAttempts: 3,
      timeout: 5000
    });
    this.eventsFormArray.controls.forEach(control => control.setValue(true));
    this.showForm = true;
  }

  editWebhook(webhook: WebhookConfig): void {
    this.editingWebhook = webhook;
    this.webhookForm.patchValue({
      name: webhook.name,
      enabled: webhook.enabled,
      url: webhook.url,
      platform: webhook.platform,
      customPayload: webhook.customPayload || '',
      retryAttempts: webhook.retryAttempts,
      timeout: webhook.timeout
    });

    // Set events checkboxes
    this.eventsFormArray.controls.forEach((control, index) => {
      control.setValue(webhook.events.includes(this.events[index]));
    });

    this.showForm = true;
  }

  saveWebhook(): void {
    if (this.webhookForm.invalid) {
      Object.keys(this.webhookForm.controls).forEach(key => {
        this.webhookForm.controls[key].markAsTouched();
      });
      return;
    }

    const formValue = this.webhookForm.value;
    const selectedEvents = this.events.filter((_, index) =>
      this.eventsFormArray.at(index).value
    );

    if (selectedEvents.length === 0) {
      alert('Please select at least one event');
      return;
    }

    const webhookData: Partial<WebhookConfig> = {
      name: formValue.name,
      enabled: formValue.enabled,
      url: formValue.url,
      platform: formValue.platform,
      events: selectedEvents,
      customPayload: formValue.customPayload || undefined,
      retryAttempts: formValue.retryAttempts,
      timeout: formValue.timeout
    };

    if (this.editingWebhook) {
      this.webhookService.updateWebhook(this.editingWebhook.id, webhookData);
    } else {
      this.webhookService.addWebhook(webhookData);
    }

    this.cancelForm();
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingWebhook = null;
    this.webhookForm.reset();
  }

  deleteWebhook(webhook: WebhookConfig): void {
    if (confirm(`Are you sure you want to delete webhook "${webhook.name}"?`)) {
      this.webhookService.deleteWebhook(webhook.id);
    }
  }

  toggleWebhook(webhook: WebhookConfig): void {
    this.webhookService.updateWebhook(webhook.id, { enabled: !webhook.enabled });
  }

  async testWebhook(webhook: WebhookConfig): Promise<void> {
    this.testingWebhookId = webhook.id;
    try {
      const success = await this.webhookService.testWebhook(webhook.id);
      if (success) {
        alert(`Test webhook sent successfully to ${webhook.name}!`);
      } else {
        alert(`Failed to send test webhook to ${webhook.name}. Check console for details.`);
      }
    } catch (error) {
      alert(`Error testing webhook: ${error}`);
    } finally {
      this.testingWebhookId = null;
    }
  }

  toggleLogs(): void {
    this.showLogs = !this.showLogs;
  }

  clearLogs(): void {
    if (confirm('Are you sure you want to clear all webhook logs?')) {
      this.webhookService.clearLogs();
    }
  }

  getWebhookName(webhookId: string): string {
    const webhook = this.webhooks.find(wh => wh.id === webhookId);
    return webhook?.name || 'Unknown';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }

  getStatusClass(status: 'success' | 'failed'): string {
    return status === 'success' ? 'status-success' : 'status-failed';
  }

  getStatusIcon(status: 'success' | 'failed'): string {
    return status === 'success' ? '✓' : '✗';
  }

  getPlatformIcon(platform: WebhookPlatform): string {
    const icons: { [key in WebhookPlatform]: string } = {
      [WebhookPlatform.DISCORD]: '💬',
      [WebhookPlatform.TELEGRAM]: '✈️',
      [WebhookPlatform.SLACK]: '💼',
      [WebhookPlatform.CUSTOM]: '🔗'
    };
    return icons[platform];
  }
}
