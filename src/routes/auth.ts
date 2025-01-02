import { Router } from "express";
import { login, registerAgency, resetPassword, verifyEmail, verifyResetPassword } from "../controllers/auth";
import { generateAuthUrl, loginWithGoogle, refreshToken } from "../controllers/Google";

export default (router: Router): void => {
    /**
     * @swagger
     * /auth/register:
     *   post:
     *     summary: Register agency/recruiters
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: "#/components/schemas/Agency"
     *     responses:
     *       200:
     *         description: Agency successfully registered
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: "#/components/schemas/Agency"
     *       400:
     *         description: Input validation error
     *       409:
     *         description: Agency already exists
     */
    router.post("/auth/register", registerAgency);

    /**
     * @swagger
     * /auth/verify-email:
     *   post:
     *     summary: Verify email with a six-digit verification code
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *     responses:
     *       200:
     *         description: Email verification successful
     *       400:
     *         description: Invalid email format
     *       404:
     *         description: User not found
     */
    router.post("/auth/verify-email", verifyEmail);

    /**
     * @swagger
     * /auth/login:
     *   post:
     *     summary: Login to the agency account
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               password:
     *                 type: string
     *                 format: password
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *                 data:
     *                   type: object
     *                   properties:
     *                     token:
     *                       type: string
     *                     id:
     *                       type: string
     *                     email:
     *                       type: string
     *                     name:
     *                       type: string
     *       400:
     *         description: Input validation error
     *       401:
     *         description: Invalid email or password
     */
    router.post("/auth/login", login);

    /**
     * @swagger
     * /auth/reset-password:
     *   post:
     *     summary: Send a password reset email with a six-digit verification code
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *     responses:
     *       200:
     *         description: Password reset request successful
     *       400:
     *         description: Invalid email format
     *       404:
     *         description: User not found
     */
    router.post("/auth/reset-password", resetPassword);

    /**
     * @swagger
     * /auth/verify-reset-password:
     *   post:
     *     summary: Verify the password reset with a new password
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               verificationCode:
     *                 type: string
     *                 description: Six-digit verification code sent to the email
     *               newPassword:
     *                 type: string
     *                 description: The new password
     *     responses:
     *       200:
     *         description: Password reset successful
     *       400:
     *         description: Invalid verification code or email format
     *       404:
     *         description: User not found
     */
    router.post("/auth/verify-reset-password", verifyResetPassword);


    router.post("auth/google", loginWithGoogle);

    router.post("auth/google/refresh-token", refreshToken);

    router.get("google/auth-url", generateAuthUrl);
};
