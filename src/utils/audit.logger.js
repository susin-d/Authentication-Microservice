/**
 * Audit Logger - v1.0.1
 * Security event logging system with database persistence
 */

const supabase = require('../config/supabase');

class AuditLogger {
  async log(event, data) {
    const logEntry = {
      event,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
      ip_address: data.ip || null,
      user_id: data.userId || null
    };

    // Log to console in all environments
    console.log(`[AUDIT] ${event}:`, data);

    // Store critical security events in database
    if (this.isCriticalEvent(event)) {
      try {
        await supabase.from('audit_logs').insert([logEntry]);
      } catch (error) {
        // Don't fail the request if audit logging fails
        console.error('Failed to write audit log:', error.message);
      }
    }
  }

  isCriticalEvent(event) {
    const criticalEvents = [
      'LOGIN_FAILED',
      'ACCOUNT_LOCKED',
      'ACCOUNT_DELETED',
      'SUSPICIOUS_ACTIVITY',
      'INVALID_TOKEN',
      'GOOGLE_OAUTH_FAILED'
    ];
    return criticalEvents.includes(event);
  }

  // Log failed login attempts
  async logFailedLogin(email, ip) {
    await this.log('LOGIN_FAILED', {
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  // Log successful authentication
  async logSuccessfulAuth(userId, email, method, ip) {
    await this.log('LOGIN_SUCCESS', {
      userId,
      email,
      method, // 'password' or 'google'
      ip
    });
  }

  // Log account deletion
  async logAccountDeletion(userId, email, ip) {
    await this.log('ACCOUNT_DELETED', {
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  // Log suspicious activity
  async logSuspiciousActivity(reason, data) {
    await this.log('SUSPICIOUS_ACTIVITY', {
      reason,
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new AuditLogger();
