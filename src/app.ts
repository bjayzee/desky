import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import { errorHandler } from "./middlewares/error";
import cors from "cors";
import router from "./routes";
import { pinoHttp } from "pino-http";
import logger from "./config/logger";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    cors({
        credentials: true,
    })
);

// Request logging
app.use(
    pinoHttp({
        logger,
        serializers: {
            req: (req) => ({
                method: req.method,
                url: req.url,
                userAgent: req.headers["user-agent"],
            }),
            res: (res) => ({
                statusCode: res.statusCode,
            }),
        },
    })
);

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Protect endpoints with API key middleware (excluding Swagger UI)
app.use((req: express.Request, res: express.Response, next: express.NextFunction): void => {
    if (req.path === '/api-docs' || req.path.startsWith('/api-docs/')) {
        return next();
    }

    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.SWAGGER_API_KEY) {
        res.status(403).json({ message: 'Forbidden: Invalid API key.' });
        return;
    }
    next();
});

// application routes
app.use("/api/v1", router());

// Error handling middleware
app.use(errorHandler);

export default app;
