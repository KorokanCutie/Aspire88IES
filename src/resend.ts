// =============================================================================
// Aspire88 Estates Corporation Integrated Enterprise System - Resend Email Integration Utility
// =============================================================================

import { AppProperties } from './appProperties';

export async function sendEmail(to: string, subject: string, html: string): Promise<any> {
  let finalSubject = subject;
  let finalHtml = html;

  if (AppProperties.mode === 'sandbox') {
    finalSubject = `[TEST] ${subject}`;
    finalHtml = `<div style="color: #ef4444; font-weight: 800; font-family: system-ui, -apple-system, sans-serif; padding: 12px; border: 2px solid #fca5a5; background-color: #fef2f2; border-radius: 8px; margin-bottom: 16px; text-align: center; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">[THIS IS JUST A TEST]</div>${html}`;
  }

  console.log(`[Resend Email] Routing email send request to server proxy for ${to} with subject: "${finalSubject}" (Sandbox: ${AppProperties.mode === 'sandbox'})...`);

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: to,
        subject: finalSubject,
        html: finalHtml
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Proxy error: ${response.status} - ${JSON.stringify(errData)}`);
    }

    const data = await response.json();
    console.log('[Resend Email] Successfully sent through proxy! Response:', data);
    return data;
  } catch (error) {
    console.log('[Resend Email] Routing exception handled:', error);
    return null;
  }
}
