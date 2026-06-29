// =============================================================================
// Aspire88 Estates Corporation Integrated Enterprise System - Resend Email Integration Utility
// =============================================================================

export async function sendEmail(to: string, subject: string, html: string): Promise<any> {
  console.log(`[Resend Email] Routing email send request to server proxy for ${to} with subject: "${subject}"...`);

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: to,
        subject: subject,
        html: html
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
