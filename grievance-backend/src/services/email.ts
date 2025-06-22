import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Simple email service for testing (logs emails instead of sending)
export const sendEmailSimple = async (name: string, email: string, subject: string, message: string) => {
    try {
        console.log("=== EMAIL SENT (TESTING MODE) ===");
        console.log("To:", email);
        console.log("Subject:", subject);
        console.log("Message:", message);
        console.log("================================");
        
        return { messageId: "test-message-id" };
    } catch (err) {
        console.error("Error in simple email service:", err);
        throw new Error("Failed to send email. Please try again later.");
    }
};

export const sendEmail = async (name: string, email: string, subject: string, message: string) => {
    // Check if OAuth2 credentials are configured
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !process.env.EMAIL) {
        console.warn("OAuth2 credentials not configured, using simple email service");
        return sendEmailSimple(name, email, subject, message);
    }
    
    try {
        const oAuth2Client = new google.auth.OAuth2(
            CLIENT_ID,
            CLIENT_SECRET,
            REDIRECT_URI
        );

        oAuth2Client.setCredentials({
            refresh_token: REFRESH_TOKEN
        });

        // Get a fresh access token
        const { credentials } = await oAuth2Client.refreshAccessToken();
        const accessToken = credentials.access_token;

//changed the email to use OAuth2 as smtp.gmail.com from gmail
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            },
            tls: {
                rejectUnauthorized: false
            }
        } as SMTPTransport.Options);

        const info = await transporter.sendMail({
            from: `"DSEU " <${process.env.EMAIL}>`, // sender address
            to: email, // list of receivers
            subject: `${subject}`,
            text: `${message}`,
        });

        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (err) {
        console.error("Error while sending mail:", err);

        throw new Error("Failed to send email. Please try again later.");
    }
};
