import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import chatRoutes from './routes/chatRoutes.js';
import { storeSessionData } from './controllers/chatControllers.js';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const AI_SERVICES_URL = process.env.AI_SERVICES_URL || 'https://successful-youthfulness-production-692c.up.railway.app';

// Middleware
app.use(cors());
app.use(express.json());

// Mount chat routes
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Root health check for Railway
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Store Video URL Endpoint
app.post('/api/video/store', async (req, res) => {
    console.log('=== Store Video URL Request ===');
    console.log('Body:', req.body);

    try {
        const { videoUrl } = req.body;

        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                error: 'videoUrl is required'
            });
        }

        // Extract videoId from videoUrl
        const videoId = videoUrl.includes('youtu.be/')
            ? videoUrl.split('/').pop().split('?')[0]
            : videoUrl.includes('youtube.com/watch?v=')
                ? videoUrl.split('v=')[1].split('&')[0]
                : 'extracted-video-id';

        console.log('Extracted videoId:', videoId);

        // Store session data for chat functionality
        console.log('About to store session data...');
        storeSessionData('test-session-123', videoId, videoUrl);
        console.log('Session data stored successfully');

        const response = {
            success: true,
            sessionId: 'test-session-123',
            videoId,
            videoUrl,
            message: 'Video URL stored successfully for chat'
        };

        console.log('Sending response:', JSON.stringify(response));
        res.json(response);
    } catch (error) {
        console.error('Store video URL error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store video URL',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Session Start Endpoint
app.post('/api/session/start', async (req, res) => {
    console.log('=== Session Start Request ===');
    console.log('Body:', req.body);

    try {
        const { videoUrl } = req.body;

        console.log('Extracted videoUrl:', videoUrl);

        // Extract videoId from videoUrl
        const videoId = videoUrl.includes('youtu.be/')
            ? videoUrl.split('/').pop().split('?')[0]
            : videoUrl.includes('youtube.com/watch?v=')
                ? videoUrl.split('v=')[1].split('&')[0]
                : 'extracted-video-id';

        console.log('Extracted videoId:', videoId);

        // Store session data for chat functionality
        console.log('About to store session data...');
        storeSessionData('test-session-123', videoId, videoUrl);
        console.log('Session data stored successfully');

        const response = {
            success: true,
            sessionId: 'test-session-123',
            videoId,
            videoUrl,
            status: 'processing',
            message: 'Session started successfully'
        };

        console.log('Sending response:', JSON.stringify(response));
        res.json(response);
    } catch (error) {
        console.error('Session start error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start session',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get Transcript Endpoint
app.get('/api/session/transcript', async (req, res) => {
    console.log('Received request to /api/session/transcript', req.query);

    try {
        const { sessionId, videoId } = req.query;

        if (!sessionId || !videoId) {
            console.log('Missing required parameters', { sessionId, videoId });
            return res.status(400).json({
                success: false,
                error: 'Both sessionId and videoId are required as query parameters'
            });
        }

        // Call ai_services to get transcript
        try {
            const response = await axios.post(`${AI_SERVICES_URL}/transcript`, {
                video_id: videoId,
                language: 'en'
            });

            console.log('Successfully got transcript from ai_services');
            res.json({
                success: true,
                sessionId,
                videoId,
                transcript: response.data.transcript || [],
                status: 'completed'
            });
        } catch (aiError) {
            console.error('Error calling ai_services for transcript:', aiError.message);
            // Fallback to mock transcript
            res.json({
                success: true,
                sessionId,
                videoId,
                transcript: "This is a sample transcript. AI services are currently unavailable.",
                status: 'completed'
            });
        }
    } catch (error) {
        console.error('Get transcript error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get transcript',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get Summary Endpoint
app.get('/api/session/summary', async (req, res) => {
    console.log('Received request to /api/session/summary', req.query);

    try {
        const { sessionId, videoId } = req.query;

        if (!sessionId || !videoId) {
            console.log('Missing required parameters', { sessionId, videoId });
            return res.status(400).json({
                success: false,
                error: 'Both sessionId and videoId are required as query parameters'
            });
        }

        // Call ai_services to get summary
        try {
            const response = await axios.post(`${AI_SERVICES_URL}/summarize`, {
                video_id: videoId,
                language: 'en'
            });

            console.log('Successfully got summary from ai_services');
            res.json({
                success: true,
                sessionId,
                videoId,
                summary: response.data.summary || "No summary available",
                status: 'completed'
            });
        } catch (aiError) {
            console.error('Error calling ai_services for summary:', aiError.message);
            // Fallback to mock summary
            res.json({
                success: true,
                sessionId,
                videoId,
                summary: "This is a sample summary. AI services are currently unavailable.",
                status: 'completed'
            });
        }
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get summary',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Quiz Generate Endpoint
app.post('/api/quiz/generate', async (req, res) => {
    console.log('Received request to /api/quiz/generate', req.body);

    try {
        const { videoUrl, transcript, summary } = req.body;

        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                error: 'videoUrl is required'
            });
        }

        // Extract videoId from videoUrl
        const videoId = videoUrl.includes('youtu.be/')
            ? videoUrl.split('/').pop().split('?')[0]
            : videoUrl.includes('youtube.com/watch?v=')
                ? videoUrl.split('v=')[1].split('&')[0]
                : 'extracted-video-id';

        // Call ai_services to get quiz questions
        try {
            const response = await axios.post(`${AI_SERVICES_URL}/questions`, {
                video_id: videoId,
                url: videoUrl,
                language: 'en'
            });

            console.log('Successfully got quiz from ai_services');
            console.log('AI services response:', response.data);
            console.log('Questions from AI:', response.data.questions);
            console.log('Type of questions:', typeof response.data.questions);
            res.json({
                success: true,
                videoUrl,
                questions: response.data.questions || [],
                message: 'Quiz generated successfully'
            });
        } catch (aiError) {
            console.error('Error calling ai_services for quiz:', aiError.message);
            // Fallback to mock quiz generation
            const mockQuestions = [
                {
                    question: "What is the main topic of this video?",
                    options: ["Topic A", "Topic B", "Topic C", "Topic D"],
                    correct: 0
                },
                {
                    question: "What key concept is explained in the video?",
                    options: ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
                    correct: 1
                }
            ];

            res.json({
                success: true,
                videoUrl,
                questions: mockQuestions,
                message: 'Quiz generated with fallback (AI services unavailable)'
            });
        }
    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate quiz',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PDF Export Endpoint
app.get('/api/export/pdf', async (req, res) => {
    console.log('Received request to /api/export/pdf');
    console.log('Query parameters:', req.query);

    try {
        // Get quiz data from query parameters
        const { questions, answers, score } = req.query;
        console.log('Questions param:', questions);
        console.log('Answers param:', answers);
        console.log('Score param:', score);

        let pdfContent = "YouTube Video Quiz Report\n";
        pdfContent += "=".repeat(50) + "\n\n";

        if (questions) {
            try {
                const quizData = JSON.parse(questions);
                const answersData = answers ? JSON.parse(answers) : {};
                const scoreData = score ? JSON.parse(score) : null;

                pdfContent += `Quiz Results: ${scoreData ? `${scoreData.correct}/${scoreData.total} (${scoreData.percentage}%)` : 'Not completed'}\n\n`;

                quizData.forEach((question, index) => {
                    pdfContent += `Question ${index + 1}: ${question.question}\n`;
                    question.options.forEach((option, optIndex) => {
                        const userAnswer = answersData[index];
                        const isCorrect = optIndex === question.correct;
                        const isSelected = optIndex === userAnswer;

                        pdfContent += `  ${String.fromCharCode(65 + optIndex)}) ${option}`;
                        if (isSelected) pdfContent += " ✓";
                        if (isCorrect) pdfContent += " (Correct)";
                        pdfContent += "\n";
                    });
                    pdfContent += "\n";
                });
            } catch (e) {
                pdfContent += "Error parsing quiz data. Please ensure you have completed the quiz first.\n";
            }
        } else {
            pdfContent += "No quiz data available. Please generate and complete a quiz first.\n";
        }

        pdfContent += "\nGenerated on: " + new Date().toLocaleString();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="quiz-report.pdf"');
        res.send(Buffer.from(pdfContent, 'utf8'));
    } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 404 handler for undefined routes
app.use((req, res) => {
    console.log('404 - Route not found:', req.originalUrl);
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `The requested URL ${req.originalUrl} was not found on this server.`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server with error handling
try {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}
