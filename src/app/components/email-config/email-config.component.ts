import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { EmailService } from '../../services/email.service';
import { EmailConfig } from '../../models/email-config.model';

@Component({
  selector: 'app-email-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './email-config.component.html',
  styleUrls: ['./email-config.component.css']
})
export class EmailConfigComponent implements OnInit {
  emailForm!: FormGroup;
  emailConfig!: EmailConfig;
  emailStats: any = null;
  emailHistory: any[] = [];
  testResult: { success: boolean; message: string } | null = null;
  showPassword = false;
  isTesting = false;
  isSaving = false;

  // Common SMTP presets
  smtpPresets = [
    { name: 'Custom', host: '', port: 587, secure: false },
    { name: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
    { name: 'Outlook/Office365', host: 'smtp.office365.com', port: 587, secure: false },
    { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    { name: 'iCloud', host: 'smtp.mail.me.com', port: 587, secure: false },
    { name: 'Zoho', host: 'smtp.zoho.com', port: 587, secure: false },
    { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false },
    { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false },
  ];

  constructor(
    private fb: FormBuilder,
    private emailService: EmailService
  ) {}

  ngOnInit(): void {
    this.emailConfig = this.emailService.getConfig();
    this.initForm();
    this.loadStats();
    this.loadHistory();

    // Auto-refresh stats every 30 seconds
    setInterval(() => this.loadStats(), 30000);
  }

  initForm(): void {
    this.emailForm = this.fb.group({
      enabled: [this.emailConfig.enabled],
      smtpHost: [this.emailConfig.smtpHost, Validators.required],
      smtpPort: [this.emailConfig.smtpPort, [Validators.required, Validators.min(1), Validators.max(65535)]],
      smtpSecure: [this.emailConfig.smtpSecure],
      smtpUser: [this.emailConfig.smtpUser, [Validators.required, Validators.email]],
      smtpPassword: [this.emailConfig.smtpPassword, Validators.required],
      fromEmail: [this.emailConfig.fromEmail, [Validators.required, Validators.email]],
      fromName: [this.emailConfig.fromName, Validators.required],
      toEmail: [this.emailConfig.toEmail, [Validators.required, Validators.email]],
      minInterval: [this.emailConfig.minInterval, [Validators.required, Validators.min(1)]],
      maxEmailsPerHour: [this.emailConfig.maxEmailsPerHour, [Validators.required, Validators.min(1)]],
      maxEmailsPerDay: [this.emailConfig.maxEmailsPerDay, [Validators.required, Validators.min(1)]],
      alertTypes: this.fb.group({
        priceAlerts: [this.emailConfig.alertTypes.priceAlerts],
        indicatorAlerts: [this.emailConfig.alertTypes.indicatorAlerts],
        volatilityAlerts: [this.emailConfig.alertTypes.volatilityAlerts],
        orderFilled: [this.emailConfig.alertTypes.orderFilled],
        positionClosed: [this.emailConfig.alertTypes.positionClosed],
        riskWarnings: [this.emailConfig.alertTypes.riskWarnings],
      }),
      useHtml: [this.emailConfig.useHtml],
      includeLogo: [this.emailConfig.includeLogo],
      includeChartLink: [this.emailConfig.includeChartLink],
    });
  }

  onPresetChange(event: any): void {
    const preset = this.smtpPresets.find(p => p.name === event.target.value);
    if (preset && preset.name !== 'Custom') {
      this.emailForm.patchValue({
        smtpHost: preset.host,
        smtpPort: preset.port,
        smtpSecure: preset.secure
      });
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async testEmail(): Promise<void> {
    if (this.emailForm.invalid) {
      this.markFormGroupTouched(this.emailForm);
      return;
    }

    this.isTesting = true;
    this.testResult = null;

    // Temporarily save config for testing
    const config = this.emailForm.value;
    this.emailService.saveConfig(config);

    this.testResult = await this.emailService.testEmailConfig();
    this.isTesting = false;

    if (this.testResult.success) {
      this.loadStats();
      this.loadHistory();
    }
  }

  saveConfig(): void {
    if (this.emailForm.invalid) {
      this.markFormGroupTouched(this.emailForm);
      return;
    }

    this.isSaving = true;
    const config = this.emailForm.value;
    this.emailService.saveConfig(config);

    setTimeout(() => {
      this.isSaving = false;
      this.testResult = {
        success: true,
        message: 'Email configuration saved successfully!'
      };
    }, 500);
  }

  loadStats(): void {
    this.emailStats = this.emailService.getEmailStats();
  }

  loadHistory(): void {
    this.emailHistory = this.emailService.getEmailHistory().slice(0, 10);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get f() { return this.emailForm.controls; }
  get alertTypesForm() { return this.emailForm.get('alertTypes') as FormGroup; }
}
