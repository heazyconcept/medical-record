import mongoose, { Document, Schema } from "mongoose";

export type UserRole = 'registrar' | 'nurse' | 'doctor' | 'pharmacist' | 'admin';

export interface IUser extends Document {
    username: string;
    password: string;
    role: UserRole;
}

const UserSchema: Schema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['registrar', 'nurse', 'doctor', 'pharmacist', 'admin']
    }
}, {
    timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema); 