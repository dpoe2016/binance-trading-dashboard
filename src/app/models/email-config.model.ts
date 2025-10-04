export interface EmailConfig {
  id?: string;
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean; // true for TLS, false for STARTTLS
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;

  // Email frequency controls
  minInterval: number; // Minimum minutes between emails
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;

  // Email types to send
  alertTypes: {
    priceAlerts: boolean;
    indicatorAlerts: boolean;
    volatilityAlerts: boolean;
    orderFilled: boolean;
    positionClosed: boolean;
    riskWarnings: boolean;
  };

  // Advanced settings
  useHtml: boolean;
  includeLogo: boolean;
  includeChartLink: boolean;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  html?: string;
}

export interface EmailQueueItem {
  id: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  timestamp: Date;
  sent: boolean;
  error?: string;
}

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  enabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: '',
  fromName: 'AlgoTrader Pro',
  toEmail: '',
  minInterval: 5, // 5 minutes
  maxEmailsPerHour: 10,
  maxEmailsPerDay: 50,
  alertTypes: {
    priceAlerts: true,
    indicatorAlerts: true,
    volatilityAlerts: true,
    orderFilled: true,
    positionClosed: true,
    riskWarnings: true,
  },
  useHtml: true,
  includeLogo: true,
  includeChartLink: true,
};
