import express from 'express';
import cors from 'cors';
import subjectRouter from './routes/subject';

const app = express();
const port = process.env.PORT || 8000;

const frontendUrl = process.env.FRONTEND_URL;

if (!frontendUrl) {
    throw new Error('FRONTEND_URL must be set to an allowed origin');
}

app.use(cors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

app.use(express.json());

app.use('/api/subjects', subjectRouter)

app.get('/', (req, res) => {
    res.json({ message: 'Classroom Management API' });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
