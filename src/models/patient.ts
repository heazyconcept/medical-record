import { time, timeStamp } from "console";
import { register } from "module";
import mongoose, { Document, Schema } from "mongoose";

export type patientStatus =
  | "registered"
  | "awaiting_doctor"
  | "awaiting_medication"
  | "completed";

export interface doctorNote {
  diagnosis: string;
  instructions: string;
}

export interface Timestamps {
    registeredAt: Date;
    noteTakenAt: Date;
    doctorReviewedAt: Date;
    medicationDispensedAt?: Date;
    lastEditedAt?: Date;
}

export interface IPatient extends Document{
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    age: number;
    phoneNumber: string;
    address: string;
    gender?: string;
    status: patientStatus;
    nurseNotes?: string;
    doctorNotes?: doctorNote;
    timestamps: Timestamps
}

const PatientSchema: Schema = new Schema({
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    dateOfBirth: {type: String, required: true},
    age: { type: Number, required: true},
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        match: [/^\+?[0-9]\d{1,14}$/, 'Please enter a valid phone number']
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        enum: ['registered', 'awaiting_doctor', 'awaiting_medication', 'completed'],
        default: 'registered'
    },
    nurseNotes: {type: String},
    doctorNote: {
        diagnosis: {type: String},
        instructions: { type: String}
    },
    
    timestamps: {
        registeredAt: {type: Date, default: Date.now},
        notesTakenAt: {type: Date},
        doctorReviewedAt: {type: Date},
        medicationDispensedAt: {type: Date},
        lastEditedAt: {type: Date}
    }
});

export default mongoose.model<IPatient>('Patient', PatientSchema);