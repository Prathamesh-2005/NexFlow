// supabase/functions/send-mention-email/index.js
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Gmail credentials
const GMAIL_USER = "coderprathamesh@gmail.com";
const GMAIL_PASS = "pdsm fzox ikfa stil";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const { 
      to, 
      mentionedUserName, 
      mentionerName, 
      pageTitle, 
      pageLink, 
      context,
      projectName 
    } = await req.json();

    if (!to) throw new Error("Missing recipient email");

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    // Beautiful HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You've been mentioned</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  
                  <!-- Header with Gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 50px 40px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 10px;">💬</div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                        You've Been Mentioned!
                      </h1>
                      <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                        Someone wants your attention
                      </p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Greeting -->
                      <p style="margin: 0 0 24px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
                        Hi ${mentionedUserName || 'there'}! 👋
                      </p>
                      
                      <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                        <strong style="color: #10b981;">${mentionerName}</strong> mentioned you in <strong>${pageTitle}</strong>
                      </p>

                      <!-- Context Card (if provided) -->
                      ${context ? `
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                        <tr>
                          <td style="background: #f9fafb; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
                            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">
                              CONTEXT
                            </div>
                            <div style="font-size: 15px; line-height: 1.6; color: #374151; font-style: italic;">
                              "${context}"
                            </div>
                          </td>
                        </tr>
                      </table>
                      ` : ''}

                      <!-- Page Info Card -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                        <tr>
                          <td style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #10b981;">
                            <div style="margin-bottom: 16px;">
                              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; font-weight: 600; margin-bottom: 6px;">
                                PAGE
                              </div>
                              <div style="font-size: 18px; font-weight: 700; color: #1f2937;">
                                📄 ${pageTitle}
                              </div>
                            </div>
                            
                            ${projectName ? `
                            <div>
                              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; font-weight: 600; margin-bottom: 6px;">
                                PROJECT
                              </div>
                              <div style="font-size: 15px; color: #4b5563; font-weight: 500;">
                                ${projectName}
                              </div>
                            </div>
                            ` : ''}
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                        Click the button below to view the page and see what they wrote!
                      </p>

                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                        <tr>
                          <td align="center">
                            <a href="${pageLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); transition: all 0.3s;">
                              View Page →
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Divider -->
                      <div style="height: 1px; background: #e5e7eb; margin: 32px 0;"></div>

                      <!-- Alternative Link -->
                      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #6b7280;">
                        <strong>Button not working?</strong><br>
                        Copy and paste this link into your browser:<br>
                        <a href="${pageLink}" style="color: #10b981; word-break: break-all; text-decoration: underline;">
                          ${pageLink}
                        </a>
                      </p>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td align="center">
                            <div style="margin-bottom: 12px;">
                              <span style="display: inline-block; width: 32px; height: 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; line-height: 32px; text-align: center; font-size: 18px;">
                                📋
                              </span>
                            </div>
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                              You're receiving this email because you were mentioned in a page.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                              © ${new Date().getFullYear()} NexFlow. All rights reserved.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>

                <!-- Extra Padding -->
                <div style="padding-top: 20px;"></div>

              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Plain text fallback
    const textContent = `
Hi ${mentionedUserName || 'there'}!

${mentionerName} mentioned you in "${pageTitle}"

${context ? `Context: "${context}"` : ''}

View the page here: ${pageLink}

---
You're receiving this email because you were mentioned in a page.
© ${new Date().getFullYear()} NexFlow. All rights reserved.
    `.trim();

    // Send email
    const info = await transporter.sendMail({
      from: `"${mentionerName} via NexFlow" <${GMAIL_USER}>`,
      to,
      subject: `💬 ${mentionerName} mentioned you in ${pageTitle}`,
      html: htmlContent,
      text: textContent,
    });

    console.log("✅ Mention email sent successfully:", info.messageId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Mention email sent successfully", 
        id: info.messageId 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error("❌ Error sending mention email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 400 
      }
    );
  }
});