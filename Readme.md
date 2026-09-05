# SynthNotes

SynthNotes is an AI-powered study application that converts learning material into flashcards and provides a structured study and review experience.

## Features

- User registration and JWT authentication
- Create and manage study decks
- Upload PDF study material
- Extract text from PDFs
- OCR fallback for PDFs with insufficient text
- AI-generated flashcards
- Flashcard study sessions
- Recall-based review ratings
- Study analytics and progress tracking
- Topic and review statistics

## Architecture

```text
React + Vite
      |
      v
Node.js + Express
      |
      +----> MongoDB Atlas
      |
      +----> Python FastAPI ML Service
                    |
                    +----> T5 Question Generation
                    |
                    +----> DistilBERT QA

Tech Stack
Frontend
React
Vite
React Router
Axios
Backend
Node.js
Express
MongoDB
Mongoose
JWT
bcryptjs
Multer
PDF processing
Machine Learning
Python
FastAPI
Transformers
TensorFlow
PyTorch
T5
DistilBERT