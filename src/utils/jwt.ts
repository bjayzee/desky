import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRE_TIME = process.env.JWT_EXPIRE_TIME as string;

interface JwtPayload {
  agencyId: string;
  email: string;
  role: string;
}

export const generateJwt = (payload: JwtPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE_TIME });
};

export const decodeJwt = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
