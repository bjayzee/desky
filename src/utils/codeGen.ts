import crypto from 'crypto';


export const generateSixDigitCode = (): string => crypto.randomInt(100000, 999999).toString();

export const generateRandomPassword = (): string =>{
    const password = crypto.randomBytes(8).toString('hex');
    return password;
}