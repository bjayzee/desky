import swaggerJSDoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "GetDesky API",
            version: "1.0.0",
            description: "API documentation for GetDesky ATS service",
            contact: {
                name: "Adams Bolaji",
                email: "adams@buildas.io",
            },
        },
        servers: [
            {
                url: "http://localhost:5000/api/v1",
                description: "Local server",
            },
            {
                url: "https://desky-ae3m.onrender.com/api/v1",
                description: "Production server",
            }
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "x-api-key",
                },
            },
            schemas: {
                Agency: {
                    type: "object",
                    properties: {
                        fullName: { type: "string", example: "John Doe" },
                        email: { type: "string", format: "email", example: "johndoe@example.com" },
                        companyName: { type: "string", example: "Example Inc." },
                        website: { type: "string", format: "url", example: "https://example.com" },
                        country: { type: "string", example: "Dubai" },
                        password: { type: "string", format: "password", example: "password123$" },
                        isVerified: { type: "boolean", example: false },
                        linkedinProfile: { type: "string", format: "url", example: "https://linkedin.com/in/johndoe" },
                    },
                    required: ["fullName", "email", "companyName", "country", "password"],
                },
                Member: {
                    type: "object",
                    properties: {
                        email: {type: "string", format: "email", example: "johndoe@example.com"},
                        agencyId: { type: String, format: "agencyId", example: "67*******159e01ec"},
                    },
                    required: ["email", "agencyId"],
                },
            },
        },
        security: [
            {
                ApiKeyAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
