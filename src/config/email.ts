import nodemailer from "nodemailer";

const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    transporter.verify((error, success) => {
        if (error) {
            console.error("Error verifying email transporter:", error);
        } else {
            console.log("Email transporter is ready to send messages!");
        }
    });

    return transporter;
};

export default createTransporter;