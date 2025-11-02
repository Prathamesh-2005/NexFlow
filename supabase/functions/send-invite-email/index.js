// supabase/functions/send-invite-email/index.js

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Parse request body
    const { to, userName, projectName, role, projectLink, inviterName } = await req.json()

    // Validate input
    if (!to || !projectName || !role || !projectLink) {
      throw new Error('Missing required fields')
    }

    // HTML Email Template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Invitation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f5;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #ffffff;
              font-size: 28px;
              font-weight: 700;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .message {
              font-size: 15px;
              color: #4b5563;
              margin-bottom: 30px;
              line-height: 1.8;
            }
            .info-box {
              background: #f9fafb;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .info-label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6b7280;
              margin-bottom: 5px;
              font-weight: 600;
            }
            .info-value {
              font-size: 16px;
              color: #1f2937;
              font-weight: 600;
            }
            .cta-button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
              transition: transform 0.2s;
            }
            .cta-button:hover {
              transform: translateY(-2px);
            }
            .footer {
              background: #f9fafb;
              padding: 30px;
              text-align: center;
              font-size: 13px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
            }
            .footer a {
              color: #667eea;
              text-decoration: none;
            }
            .divider {
              height: 1px;
              background: #e5e7eb;
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Project Invitation</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${userName || 'there'}! 👋</p>
              
              <p class="message">
                ${inviterName || 'A team member'} has invited you to collaborate on a project!
              </p>
              
              <div class="info-box">
                <div class="info-label">Project Name</div>
                <div class="info-value">${projectName}</div>
              </div>
              
              <div class="info-box">
                <div class="info-label">Your Role</div>
                <div class="info-value">${role}</div>
              </div>
              
              <p class="message">
                Click the button below to access the project and start collaborating with your team.
              </p>
              
              <center>
                <a href="${projectLink}" class="cta-button">
                  Open Project →
                </a>
              </center>
              
              <div class="divider"></div>
              
              <p style="font-size: 13px; color: #6b7280; margin: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${projectLink}" style="color: #667eea; word-break: break-all;">${projectLink}</a>
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0;">
                You're receiving this email because you were invited to collaborate on a project.
              </p>
              <p style="margin: 0;">
                © ${new Date().getFullYear()} Your App Name. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Plain text version
    const textContent = `
Hi ${userName || 'there'}!

${inviterName || 'A team member'} has invited you to collaborate on a project.

Project: ${projectName}
Your Role: ${role}

Access the project here: ${projectLink}

---
You're receiving this email because you were invited to collaborate on a project.
© ${new Date().getFullYear()} Your App Name. All rights reserved.
    `.trim()

    // Send email using Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Your App <onboarding@yourdomain.com>', // Replace with your verified domain
        to: [to],
        subject: `You've been invited to ${projectName}`,
        html: htmlContent,
        text: textContent,
      }),
    })

    if (!emailRes.ok) {
      const error = await emailRes.text()
      console.error('Resend API error:', error)
      throw new Error(`Failed to send email: ${error}`)
    }

    const data = await emailRes.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        id: data.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})