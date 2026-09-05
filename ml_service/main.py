from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, TFT5ForConditionalGeneration

import os
import re
import sys
import threading

from ml_service import qa_service as qa_module


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

QG_MODEL_PATH = os.path.join(
    BASE_DIR,
    "ml",
    "models",
    "t5_qg_epoch2"
)

QG_TOKENIZER_PATH = os.path.join(
    BASE_DIR,
    "ml",
    "models",
    "t5_qg_tokenizer"
)


# ============================================================
# CONFIGURATION
# ============================================================

SAFE_TOKEN_LIMIT = 450
MAX_CANDIDATES_PER_CHUNK = 5
MAX_NEW_TOKENS = 64

# QA validation threshold.
QA_MATCH_THRESHOLD = 0.60


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="SynthNotes ML Service",
    version="1.0.0"
)


# ============================================================
# ML MODEL STATE
# ============================================================

tokenizer = None
qg_model = None
qa_service = None

models_ready = False
models_loading = False
models_error = None


# ============================================================
# LOAD ML MODELS IN BACKGROUND
# ============================================================

def load_models():

    global tokenizer
    global qg_model
    global qa_service
    global models_ready
    global models_loading
    global models_error

    try:

        models_loading = True

        # ----------------------------------------------------
        # T5 tokenizer
        # ----------------------------------------------------

        print("Loading T5 tokenizer...")

        tokenizer = AutoTokenizer.from_pretrained(
            QG_TOKENIZER_PATH
        )

        print("T5 tokenizer loaded successfully.")

        # ----------------------------------------------------
        # T5 question generation model
        # ----------------------------------------------------

        print("Loading T5 question generation model...")

        qg_model = TFT5ForConditionalGeneration.from_pretrained(
            QG_MODEL_PATH
        )

        print(
            "T5 question generation model loaded successfully."
        )

        # ----------------------------------------------------
        # QA service
        # ----------------------------------------------------

        print("Loading QA service...")

        qa_service = qa_module.QAService()

        print("QA service loaded successfully.")

        # ----------------------------------------------------
        # Models ready
        # ----------------------------------------------------

        models_ready = True
        models_loading = False

        print("=" * 60)
        print("ALL ML MODELS READY")
        print("=" * 60)

    except Exception as error:

        models_loading = False
        models_error = str(error)

        print("=" * 60)
        print("ML MODEL LOADING FAILED")
        print("=" * 60)

        print(error)


# ============================================================
# FASTAPI STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    thread = threading.Thread(
        target=load_models,
        daemon=True
    )

    thread.start()


# ============================================================
# REQUEST MODEL
# ============================================================

class ProcessRequest(BaseModel):
    text: str


# ============================================================
# TOKEN UTILITIES
# ============================================================

def count_tokens(text):

    if tokenizer is None:
        raise RuntimeError(
            "T5 tokenizer is not loaded yet."
        )

    tokens = tokenizer.encode(
        text,
        add_special_tokens=True
    )

    return len(tokens)


# ============================================================
# SENTENCE SPLITTING
# ============================================================

def split_sentences(text):

    sentences = re.split(
        r"(?<=[.!?])\s+(?=[A-Z0-9])",
        text
    )

    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]


# ============================================================
# CHUNKING
# ============================================================

def create_chunks(text):

    paragraphs = [
        paragraph.strip()
        for paragraph in text.split("\n\n")
        if paragraph.strip()
    ]

    chunks = []

    current_text = ""

    def add_chunk(text_value):

        if not text_value.strip():
            return

        chunks.append(
            {
                "index": len(chunks) + 1,
                "text": text_value.strip(),
                "tokens": count_tokens(text_value)
            }
        )

    for paragraph in paragraphs:

        paragraph_tokens = count_tokens(
            paragraph
        )

        if paragraph_tokens <= SAFE_TOKEN_LIMIT:

            candidate = (
                f"{current_text}\n\n{paragraph}"
                if current_text
                else paragraph
            )

            candidate_tokens = count_tokens(
                candidate
            )

            if candidate_tokens <= SAFE_TOKEN_LIMIT:

                current_text = candidate

            else:

                if current_text:
                    add_chunk(current_text)

                current_text = paragraph

            continue

        # ----------------------------------------------------
        # Long paragraph -> split by sentences
        # ----------------------------------------------------

        sentences = split_sentences(
            paragraph
        )

        for sentence in sentences:

            sentence_tokens = count_tokens(
                sentence
            )

            # ------------------------------------------------
            # Extremely long sentence
            # ------------------------------------------------

            if sentence_tokens > SAFE_TOKEN_LIMIT:

                words = sentence.split()

                word_chunk = ""

                for word in words:

                    candidate = (
                        f"{word_chunk} {word}"
                        if word_chunk
                        else word
                    )

                    candidate_tokens = count_tokens(
                        candidate
                    )

                    if candidate_tokens <= SAFE_TOKEN_LIMIT:

                        word_chunk = candidate

                    else:

                        if current_text:

                            add_chunk(
                                current_text
                            )

                            current_text = ""

                        if word_chunk:

                            add_chunk(
                                word_chunk
                            )

                        word_chunk = word

                if word_chunk:
                    current_text = word_chunk

                continue

            candidate = (
                f"{current_text} {sentence}"
                if current_text
                else sentence
            )

            candidate_tokens = count_tokens(
                candidate
            )

            if candidate_tokens <= SAFE_TOKEN_LIMIT:

                current_text = candidate

            else:

                if current_text:

                    add_chunk(
                        current_text
                    )

                current_text = sentence

    if current_text:

        add_chunk(
            current_text
        )

    return chunks


# ============================================================
# HIGHLIGHT ANSWER FOR T5
# ============================================================

def highlight_answer(
    context,
    answer
):

    start = context.find(
        answer
    )

    if start == -1:

        raise ValueError(
            f"Answer was not found in context: {answer}"
        )

    end = start + len(answer)

    return (
        context[:start]
        + "<hl> "
        + context[start:end]
        + " <hl>"
        + context[end:]
    )


# ============================================================
# QUESTION GENERATION
# ============================================================

def generate_question(
    context,
    answer
):

    if tokenizer is None or qg_model is None:

        raise RuntimeError(
            "Question generation model is not ready."
        )

    highlighted_context = highlight_answer(
        context,
        answer
    )

    input_text = (
        f"generate question: "
        f"{highlighted_context}"
    )

    inputs = tokenizer(
        input_text,
        return_tensors="tf",
        truncation=True,
        max_length=512
    )

    output_ids = qg_model.generate(
        input_ids=inputs["input_ids"],
        attention_mask=inputs["attention_mask"],
        max_new_tokens=MAX_NEW_TOKENS,
        num_beams=4,
        early_stopping=True
    )

    question = tokenizer.decode(
        output_ids[0],
        skip_special_tokens=True
    )

    return question.strip()


# ============================================================
# CANDIDATE ANSWER GENERATION
# ============================================================

def get_candidate_answers(
    context,
    max_candidates=MAX_CANDIDATES_PER_CHUNK
):

    try:

        sys.path.insert(
            0,
            os.path.join(
                BASE_DIR,
                "ml"
            )
        )

        from generation.candidate_answer_generator import (
            get_answer_candidates
        )

        candidates = get_answer_candidates(
            context,
            max_candidates=max_candidates
        )

        return candidates

    except Exception as error:

        print(
            f"Candidate generation failed: {error}"
        )

        return []


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text):

    if not text:
        return ""

    text = str(text).lower()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    text = re.sub(
        r"[^\w\s]",
        "",
        text
    )

    return text.strip()


# ============================================================
# ANSWER MATCHING
# ============================================================

def calculate_answer_match(
    candidate_answer,
    qa_answer
):

    candidate = normalize_text(
        candidate_answer
    )

    predicted = normalize_text(
        qa_answer
    )

    if not candidate or not predicted:
        return 0.0

    # --------------------------------------------------------
    # Exact match
    # --------------------------------------------------------

    if candidate == predicted:
        return 1.0

    # --------------------------------------------------------
    # Candidate contained inside QA answer
    # --------------------------------------------------------

    if candidate in predicted:

        return len(candidate) / len(predicted)

    # --------------------------------------------------------
    # QA answer contained inside candidate
    # --------------------------------------------------------

    if predicted in candidate:

        return len(predicted) / len(candidate)

    # --------------------------------------------------------
    # Token overlap
    # --------------------------------------------------------

    candidate_tokens = set(
        candidate.split()
    )

    predicted_tokens = set(
        predicted.split()
    )

    if not candidate_tokens or not predicted_tokens:
        return 0.0

    intersection = (
        candidate_tokens
        & predicted_tokens
    )

    union = (
        candidate_tokens
        | predicted_tokens
    )

    return len(intersection) / len(union)


# ============================================================
# VALIDATE GENERATED FLASHCARD
# ============================================================

def validate_generated_item(
    context,
    candidate_answer,
    question
):

    if qa_service is None:

        return {
            "validated": False,
            "validationScore": 0.0,
            "qaAnswer": "",
            "qaScore": 0.0,
            "validationReason": "qa-service-not-ready"
        }

    try:

        qa_result = qa_service.extract_answer(
            context=context,
            question=question
        )

    except Exception as error:

        print(
            f"QA validation failed: {error}"
        )

        return {
            "validated": False,
            "validationScore": 0.0,
            "qaAnswer": "",
            "qaScore": 0.0,
            "validationReason": "qa-error"
        }

    qa_answer = qa_result.get(
        "answer",
        ""
    )

    qa_score = qa_result.get(
        "score",
        0.0
    )

    match_score = calculate_answer_match(
        candidate_answer,
        qa_answer
    )

    validated = (
        match_score >= QA_MATCH_THRESHOLD
    )

    if validated:

        reason = "candidate-and-qa-answer-match"

    elif not qa_answer:

        reason = "qa-returned-empty-answer"

    else:

        reason = "candidate-and-qa-answer-mismatch"

    return {
        "validated": validated,
        "validationScore": round(
            match_score,
            4
        ),
        "qaAnswer": qa_answer,
        "qaScore": round(
            qa_score,
            4
        ),
        "validationReason": reason
    }


# ============================================================
# QUESTION NORMALIZATION
# ============================================================

def normalize_question(question):

    if not question:
        return ""

    question = question.lower()

    question = re.sub(
        r"\s+",
        " ",
        question
    )

    question = question.strip()

    question = question.rstrip(
        "?.!"
    )

    return question


# ============================================================
# QUESTION DEDUPLICATION
# ============================================================

def is_duplicate_question(
    question,
    existing_questions
):

    normalized = normalize_question(
        question
    )

    for existing in existing_questions:

        if normalized == normalize_question(
            existing
        ):

            return True

    return False


# ============================================================
# PROCESS TEXT
# ============================================================

@app.post("/process")
def process_text(
    request: ProcessRequest
):

    # --------------------------------------------------------
    # Models must be ready before processing
    # --------------------------------------------------------

    if not models_ready:

        if models_error:

            raise HTTPException(
                status_code=500,
                detail=(
                    "ML models failed to load: "
                    + models_error
                )
            )

        raise HTTPException(
            status_code=503,
            detail=(
                "ML models are still loading. "
                "Please try again shortly."
            )
        )

    text = request.text.strip()

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Text is required."
        )

    chunks = create_chunks(
        text
    )

    processed_chunks = []

    total_candidates = 0
    total_questions = 0
    total_validated = 0
    total_rejected = 0

    all_questions = []

    for chunk in chunks:

        context = chunk["text"]

        candidates = get_candidate_answers(
            context
        )

        generated_items = []

        for candidate in candidates:

            answer = candidate.get(
                "answer",
                ""
            ).strip()

            if not answer:
                continue

            # ------------------------------------------------
            # Generate question
            # ------------------------------------------------

            try:

                question = generate_question(
                    context=context,
                    answer=answer
                )

            except Exception as error:

                print(
                    f"QG failed for answer "
                    f"'{answer}': {error}"
                )

                continue

            if not question:
                continue

            total_questions += 1

            # ------------------------------------------------
            # Validate using QA
            # ------------------------------------------------

            validation = validate_generated_item(
                context=context,
                candidate_answer=answer,
                question=question
            )

            # ------------------------------------------------
            # Deduplicate only after QG
            # ------------------------------------------------

            duplicate = is_duplicate_question(
                question,
                all_questions
            )

            if duplicate:

                validation["validated"] = False

                validation["validationReason"] = (
                    "duplicate-question"
                )

            # ------------------------------------------------
            # Store complete debugging information
            # ------------------------------------------------

            item = {
                "question": question,
                "answer": answer,
                "source": candidate.get(
                    "source",
                    "unknown"
                ),
                "candidateScore": candidate.get(
                    "score",
                    None
                ),
                "qaAnswer": validation[
                    "qaAnswer"
                ],
                "qaScore": validation[
                    "qaScore"
                ],
                "validationScore": validation[
                    "validationScore"
                ],
                "validated": validation[
                    "validated"
                ],
                "validationReason": validation[
                    "validationReason"
                ]
            }

            generated_items.append(
                item
            )

            if validation["validated"]:

                total_validated += 1

                all_questions.append(
                    question
                )

            else:

                total_rejected += 1

        total_candidates += len(
            candidates
        )

        processed_chunks.append(
            {
                "index": chunk["index"],
                "text": context,
                "tokens": chunk["tokens"],
                "candidateCount": len(
                    candidates
                ),
                "questionCount": len(
                    generated_items
                ),
                "validatedCount": sum(
                    1
                    for item in generated_items
                    if item["validated"]
                ),
                "items": generated_items
            }
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "success": True,
        "message": (
            "Text processed, questions generated, "
            "and answers validated."
        ),
        "document": {
            "characters": len(text),
            "tokens": count_tokens(text),
            "chunkCount": len(chunks),
            "candidateCount": total_candidates,
            "questionCount": total_questions,
            "validatedCount": total_validated,
            "rejectedCount": total_rejected,
            "chunks": processed_chunks
        }
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    if models_error:

        return {
            "success": False,
            "service": "SynthNotes ML Service",
            "status": "error",
            "error": models_error
        }

    if models_ready:

        return {
            "success": True,
            "service": "SynthNotes ML Service",
            "status": "ready",
            "tokenizer": "loaded",
            "questionGenerator": "loaded",
            "questionAnswering": "loaded"
        }

    return {
        "success": True,
        "service": "SynthNotes ML Service",
        "status": "loading"
    }