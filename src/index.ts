import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Classroom Management API' });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
