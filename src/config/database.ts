import mongoose from 'mongoose';


export const connectDB = async () => {
    try {
        console.log('attempting to connect to database')
        await mongoose.connect(process.env.DB_URI as string);
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed', error);
        process.exit(1);
    }
};
