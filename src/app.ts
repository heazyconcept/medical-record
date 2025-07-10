import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import patientRoutes from './routes/patients';
import authRoutes from './routes/auth';
import { createInitialUsers } from './controllers/authController';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
    // Create initial users for testing
    createInitialUsers();
  })
  .catch(err => console.error("MongoDB connection error", err));

// Routes
app.use('/auth', authRoutes);
app.use('/patients', patientRoutes);

export default app;