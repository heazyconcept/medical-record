import { Request, Response } from "express";
import Patient, {IPatient, patientStatus} from "../models/patient";
import { calculateAge } from "./utils";



// register user
export const registerPatient = async (req: Request, res: Response): Promise<any> => {
    try {
        const {
            firstName, 
            lastName, 
            dateOfBirth, 
            phoneNumber,
            address,
            gender
        } = req.body;

        // Check if patient exists by phone number
        const existingPatient = await Patient.findOne({ phoneNumber });
        if (existingPatient) {
            return res.status(409).json({
                message: 'A patient with this phone number already exists',
                existingPatientId: existingPatient._id
            });
        }

        if (!address || address.trim().length === 0) {
            return res.status(400).json({
                message: 'Address is required'
            });
        }

        const age = calculateAge(new Date(dateOfBirth));

        const patient: IPatient = new Patient({
            firstName,
            lastName,
            dateOfBirth,
            age,
            phoneNumber,
            address: address.trim(),
            status: 'registered',
            gender,
            timestamps: {
                registeredAt: new Date()
            },

        });

        await patient.save();
        res.status(201).json(patient);
    } catch (error: any) {
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            return res.status(400).json({
                message: 'Validation error',
                errors: validationErrors
            });
        }
        
        // Handle mongoose unique constraint violations
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'A patient with this phone number already exists'
            });
        }
        
        res.status(500).json({
            message: "Error registering patient", 
            error: error.message
        });
    }
};

export const getPatients = async (req: Request, res: Response) => {
    try{
        const {status} = req.query

        let query = {};
        if(status) {
            query = {status};
        }

        // Sort by registeredAt timestamp in ascending order (oldest first - FIFO)
        const patients = await Patient.find(query).sort({ 'timestamps.registeredAt': 1 });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: "Error fetching patients", error});
    }
};

//add nurse note and update notes
export const addNurseNotes = async (req: Request, res: Response): Promise<any> => {
    try{
        const {id} = req.params;
        const {notes} = req.body;

        const patient = await Patient.findByIdAndUpdate(
            id,
            {
                nurseNotes: notes,
                status: 'awaiting_doctor',
                $set: {'timestamps.noteTakenAt': new Date()}
            },
            {new: true}
        );
        
        if(!patient) {
            return res.status(404).json({message: 'Patient not Found'})
        }

        res.json(patient);
    } catch (error) {
        res.status(500).json({message: 'Error adding nurse notes'});
    }
};

//add doctor's note
export const addDoctorNote = async (req: Request, res: Response): Promise<any> => {
    try {
        const {id} = req.params
        const { diagnosis, instructions} = req.body;

        const patient = await Patient.findByIdAndUpdate(
            id,
            {
                doctorNotes: {diagnosis, instructions},
                status: 'awaiting_medication',
                $set: {'timestamps.doctorReviewedAt': new Date()}
            },
            { new: true }
        );
        if(!patient) {
            return res.status(404).json({message: 'Patient not Found'})
        }

        res.json(patient);
    } catch (error) {
        res.status(500).json({message: 'Error adding doctor notes'});
    }
};

//add pharmacists medication
export const addMedication = async (req: Request, res: Response): Promise<any> => {
    try {
        const {id} = req.params;

        const patient = await Patient.findById(id);
        if(!patient) {
            return res.status(404).json({message: 'Patient not Found'});
        }

        if (patient.status !== 'awaiting_medication') {
            return res.status(400).json({message: 'Can only dispense medication to patients awaiting medication'});
        }

        const updatedPatient = await Patient.findByIdAndUpdate(
            id,
            {
                status: 'completed',
                $set: { 'timestamps.medicationDispensedAt': new Date() }
            },
            { new: true }
        );

        res.json(updatedPatient);
    } catch (error) {
        res.status(500).json({message: 'Error marking medication as dispensed'});
    }
};