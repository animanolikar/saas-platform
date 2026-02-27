import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env['GMAIL_USER'] || 'redbullrock9@gmail.com',
                pass: process.env['GMAIL_APP_PASSWORD'], // Must be set in .env
            },
        });
    }

    async sendEmail(to: string, subject: string, html: string) {
        try {
            const info = await this.transporter.sendMail({
                from: '"Yukti Platform" <redbullrock9@gmail.com>', // sender address
                to, // list of receivers
                subject, // Subject line
                html, // html body
            });
            console.log('Message sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            // Don't throw, just log to prevent crashing the flow? Or throw depending on criticality.
            // For notifications, logging is usually preferred.
            return null;
        }
    }

    async sendUserWelcome(email: string, firstName: string, tempPassword: string) {
        const frontendUrl = process.env['FRONTEND_URL'] ||
            (process.env['NODE_ENV'] === 'development' ? 'http://localhost:4200' : 'http://brahmand.co');
        const loginLink = `${frontendUrl}/login`;

        const subject = 'Welcome to Yukti Platform! 🚀';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Yukti</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px;">
        <!-- Header -->
        <tr>
            <td align="center" style="padding: 40px 0; background: linear-gradient(135deg, #E10600 0%, #9B0C08 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">YUKTI</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Assessment & Learning Platform</p>
            </td>
        </tr>

        <!-- Body -->
        <tr>
            <td style="padding: 40px;">
                <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px;">Welcome aboard, ${firstName}! 👋</h2>
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    We're excited to have you on the Yukti Platform. Your account has been successfully created by your administrator. 
                </p>
                
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    Here are your temporary credentials to get started. Please log in and change your password immediately to secure your account.
                </p>

                <!-- Credentials Card -->
                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding-bottom: 10px; width: 30px;">
                                <span style="font-size: 18px;"></span>
                            </td>
                            <td style="padding-bottom: 10px;">
                                <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Email Address</span>
                                <strong style="color: #1a1a1a; font-size: 16px;">${email}</strong>
                            </td>
                        </tr>
                        <tr>
                            <td style="width: 30px;">
                                <span style="font-size: 18px;"></span>
                            </td>
                            <td>
                                <span style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Temporary Password</span>
                                <strong style="color: #E10600; font-size: 18px; font-family: monospace;">${tempPassword}</strong>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- CTA -->
                <div align="center" style="margin-top: 30px;">
                    <a href="${loginLink}" style="display: inline-block; padding: 14px 32px; background-color: #E10600; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">Login to Dashboard</a>
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 14px; margin: 0;">
                    Need help? Contact your administrator or support team.
                </p>
                <p style="color: #adb5bd; font-size: 12px; margin: 10px 0 0 0;">
                    &copy; ${new Date().getFullYear()} Yukti Platform. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
        return this.sendEmail(email, subject, html);
    }

    async sendPasswordReset(email: string, firstName: string, resetLink: string) {
        const subject = 'Reset Your Password - Yukti Platform 🔒';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px;">
        <!-- Header -->
        <tr>
            <td align="center" style="padding: 40px 0; background: linear-gradient(135deg, #E10600 0%, #9B0C08 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">YUKTI</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Assessment & Learning Platform</p>
            </td>
        </tr>

        <!-- Body -->
        <tr>
            <td style="padding: 40px;">
                <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px;">Reset Your Password</h2>
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    Hi ${firstName},
                </p>
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
                </p>
                
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    To reset your password, click the button below. This link will expire in 15 minutes.
                </p>

                <!-- CTA -->
                <div align="center" style="margin-top: 30px; margin-bottom: 30px;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #E10600; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">Reset Password</a>
                </div>

                <p style="color: #6c757d; font-size: 14px; text-align: center;">
                    Or copy this link to your browser:<br>
                    <a href="${resetLink}" style="color: #E10600; word-break: break-all;">${resetLink}</a>
                </p>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} Yukti Platform. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
        return this.sendEmail(email, subject, html);
    }
    async sendExamAssignmentEmail(email: string, firstName: string, examTitle: string, examLink: string) {
        const subject = `New Exam Assigned: ${examTitle} 📝`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Exam Assigned</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px;">
        <!-- Header -->
        <tr>
            <td align="center" style="padding: 40px 0; background: linear-gradient(135deg, #E10600 0%, #9B0C08 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">YUKTI</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Assessment & Learning Platform</p>
            </td>
        </tr>

        <!-- Body -->
        <tr>
            <td style="padding: 40px;">
                <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px;">New Exam Assigned! 📚</h2>
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    Hi ${firstName},
                </p>
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    You have been assigned a new exam: <strong style="color: #E10600;">${examTitle}</strong>.
                </p>
                
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    Please log in and attempt the exam before the due date. Good luck!
                </p>

                <!-- CTA -->
                <div align="center" style="margin-top: 30px; margin-bottom: 30px;">
                    <a href="${examLink}" style="display: inline-block; padding: 14px 32px; background-color: #E10600; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">Start Exam</a>
                </div>

                <p style="color: #6c757d; font-size: 14px; text-align: center;">
                    Or copy this link to your browser:<br>
                    <a href="${examLink}" style="color: #E10600; word-break: break-all;">${examLink}</a>
                </p>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} Yukti Platform. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
        return this.sendEmail(email, subject, html);
    }

    async sendAiReportEmail(email: string, firstName: string, markdownContent: string) {
        // Convert Markdown to HTML
        const marked = require('marked'); // Dynamic import to avoid type issues if not avail in global
        const reportHtml = marked.parse(markdownContent);

        const subject = `Your AI Performance Report 📊`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Performance Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px;">
        <!-- Header -->
        <tr>
            <td align="center" style="padding: 40px 0; background: linear-gradient(135deg, #1cc88a 0%, #13855c 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">YUKTI AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Performance Analytics Engine</p>
            </td>
        </tr>

        <!-- Body -->
        <tr>
            <td style="padding: 40px;">
                <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px;">Hello ${firstName}, Here is your Report! 🚀</h2>
                <p style="color: #4a4a4a; line-height: 1.6; font-size: 16px;">
                    Our AI has analyzed your recent performance data. Below is your detailed "Zero to Hero" strategy report.
                </p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

                <!-- Report Content -->
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6;">
                    ${reportHtml}
                </div>

                <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">

                <p style="color: #6c757d; font-size: 14px; text-align: center;">
                    This report was auto-generated by Yukti AI based on your latest exam data.
                </p>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} Yukti Platform. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
        return this.sendEmail(email, subject, html);
    }
}

