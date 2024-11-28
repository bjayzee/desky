import { Schema, model, Document } from "mongoose";
import { TokenType } from "../types/enums";

interface IToken extends Document {
    userId: string;
    token: string;
    type: TokenType
    expiresAt: Date;
}

const tokenSchema = new Schema<IToken>(
    {
        userId: { type: String, required: true },
        token: { type: String, required: true, unique: true },
        type: {
            type: String,
            enum: Object.values(TokenType),
            required: true,
        },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// Automatically remove expired tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenModel = model<IToken>("Token", tokenSchema);


// create token
export const createToken = (tokenData: Partial<IToken>) =>
    new TokenModel(tokenData)
        .save()
        .then((savedToken) => savedToken.toObject());


// Find a token document by its value.

export const findToken = async (token: string) => TokenModel.findOne({ token });

// delete the token document
export const deleteToken = async (token: string) => {
    return TokenModel.deleteOne({ token });
};
