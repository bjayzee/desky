import jwt from 'jsonwebtoken';



const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRE_TIME = process.env.JWT_EXPIRE_TIME as string;

interface JwtPayload {
    agencyId: string;
    email: string;
    role: string;
}

export const generateJwt = (payload: JwtPayload, expiresIn: string = JWT_EXPIRE_TIME) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
