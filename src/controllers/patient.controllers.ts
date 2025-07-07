import { Request, Response } from "express";
import Patient, {IPatient, patientStatus} from "../models/patient";
import { calculateAge } from "./utils";



// register user
export const registerPatient = async (req: Request, res: Response) => {
    try {
        const {firstName, lastName, dateOfBirth} = req.body;
        const age = calculateAge(new Date(dateOfBirth));

        const patient: IPatient = new Patient({
            firstName,
            lastName,
            dateOfBirth,
            age,
            status: 'registered',
            timestamps: {
                registeredAt: new Date()
            }
        });

        await patient.save();
        res.status(201).json(patient);
    } catch (error){
        res.status(500).json({message: "Error registering patient", error});
    }
};

export const getPatients = async (req: Request, res: Response) => {
    try{
        const {status} = req.query

        let query = {};
        if(status) {
            query = {status};
        }

        const patients = await Patient.find(query);
        res.json(patients)
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
        const {drugs, dosage, duration} = req.body;

        const patient = await Patient.findByIdAndUpdate(
            id,
            {
                pharmacistNotes: {drugs, dosage, duration},
                status: 'completed',
                $set: {'timestamps.medicationDispensedAt': new Date()}
            },
            {new: true}
        );
         if(!patient) {
            return res.status(404).json({message: 'Patient not Found'})
        }

        res.json(patient);
    } catch (error) {
        res.status(500).json({message: 'Error adding mediactions'});
    }
};