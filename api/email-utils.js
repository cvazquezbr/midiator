import nodemailer from 'nodemailer';

/**
 * Sends a notification email when a LinkedIn post is successfully published.
 *
 * @param {Object} params
 * @param {string} params.to - The recipient email address.
 * @param {string} params.campaignTitle - The title of the campaign.
 * @param {string} params.postUrl - The URL of the published LinkedIn post.
 * @param {string} params.postContent - The full content of the post.
 */
export async function sendPublicationNotification({ to, campaignTitle, postUrl, postContent }) {
    if (!to) {
        console.warn('[Email Utils] No recipient email provided for notification.');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Truncate content to 180 characters for the preview
        const contentPreview = postContent && postContent.length > 180
            ? postContent.substring(0, 177) + '...'
            : postContent;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Midiator'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: to,
            subject: `Publicação Realizada: ${campaignTitle}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #0077B5;">Sua publicação está no ar!</h2>
                    <p>Olá,</p>
                    <p>A publicação da campanha <strong>"${campaignTitle}"</strong> foi realizada com sucesso no LinkedIn.</p>

                    <div style="background-color: #f3f6f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin-top: 0; color: #666; font-size: 0.9em;">Prévia do conteúdo:</p>
                        <p style="font-style: italic; color: #333;">"${contentPreview}"</p>
                    </div>

                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${postUrl}" style="background-color: #0077B5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ver publicação no LinkedIn</a>
                    </p>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 0.8em; color: #999; text-align: center;">
                        Este é um e-mail automático enviado pelo Midiator.
                    </p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Utils] Notification sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('[Email Utils] Error sending notification email:', error);
        throw error;
    }
}
