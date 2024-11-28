import transporter from "../config/email";

/**
 * Sends an email using Nodemailer.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Subject of the email.
 * @param {string} text - Text content of the email.
 * @returns {Promise<void>} Resolves if the email is sent successfully, otherwise throws an error.
 */
export const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
    try {

        const mailOptions = {
            from: process.env.EMAIL_USER, 
            to, 
            subject,
            text,
        };

        // Send the email

        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}`);
    } catch (error) {
        console.error(`Failed to send email: ${error}`);
        throw new Error("Failed to send email");
    }
};
