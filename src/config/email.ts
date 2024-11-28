import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "bjayzee@gmail.com",
        pass: 'yjkl jqut irld frby'
    },
});

export default transporter;