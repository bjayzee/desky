import crypto from 'crypto';


export const generateSixDigitCode = (): string => crypto.randomInt(100000, 999999).toString();