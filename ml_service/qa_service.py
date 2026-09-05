import os
import re

import tensorflow as tf
import tf_keras
from transformers import AutoTokenizer, TFAutoModel


BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

QA_MODEL_NAME = "distilbert-base-uncased"

QA_CHECKPOINT_PATH = os.path.join(
    BASE_DIR,
    "ml",
    "checkpoints",
    "qa_compilefit",
    "qa_epoch_02.weights.h5",
)

QA_MAX_LENGTH = 512


class DistilBertQA(tf_keras.Model):

    def __init__(self, model_name=QA_MODEL_NAME):
        super().__init__()

        self.distilbert = TFAutoModel.from_pretrained(
            model_name,
            from_pt=False
        )

        self.qa_outputs = tf_keras.layers.Dense(
            2,
            name="qa_outputs"
        )

    def call(self, inputs, training=False):

        outputs = self.distilbert(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            training=training
        )

        logits = self.qa_outputs(
            outputs.last_hidden_state
        )

        return {
            "start_logits": logits[:, :, 0],
            "end_logits": logits[:, :, 1]
        }


class QAService:

    def __init__(self):

        print("Loading QA tokenizer...")

        self.tokenizer = AutoTokenizer.from_pretrained(
            QA_MODEL_NAME
        )

        print("QA tokenizer loaded successfully.")

        print("Building QA model...")

        self.model = DistilBertQA()

        dummy_inputs = {
            "input_ids": tf.zeros(
                (1, QA_MAX_LENGTH),
                dtype=tf.int32
            ),
            "attention_mask": tf.ones(
                (1, QA_MAX_LENGTH),
                dtype=tf.int32
            )
        }

        self.model(
            dummy_inputs,
            training=False
        )

        print("QA model built successfully.")

        if not os.path.exists(QA_CHECKPOINT_PATH):
            raise FileNotFoundError(
                f"QA checkpoint not found: {QA_CHECKPOINT_PATH}"
            )

        print("Loading QA checkpoint...")

        self.model.load_weights(
            QA_CHECKPOINT_PATH
        )

        print("QA checkpoint loaded successfully.")

    @staticmethod
    def normalize_answer(answer):

        if not answer:
            return ""

        answer = str(answer)
        answer = answer.strip()

        answer = re.sub(
            r"\s+",
            " ",
            answer
        )

        answer = answer.strip(
            " \t\n\r.,;:!?\"'()[]{}"
        )

        return answer

    def extract_answer(
        self,
        context,
        question
    ):

        context = context.strip()
        question = question.strip()

        if not context:
            raise ValueError(
                "Context is required."
            )

        if not question:
            raise ValueError(
                "Question is required."
            )

        # --------------------------------------------------
        # Tokenize exactly as a standard extractive QA pair
        # --------------------------------------------------

        encoded = self.tokenizer(
            question,
            context,
            max_length=QA_MAX_LENGTH,
            truncation="only_second",
            padding="max_length",
            return_tensors="tf",
            return_offsets_mapping=True
        )

        offset_mapping = encoded.pop(
            "offset_mapping"
        )

        token_type_ids = encoded.get(
            "token_type_ids"
        )

        # --------------------------------------------------
        # Run model
        # --------------------------------------------------

        outputs = self.model(
            {
                "input_ids": encoded["input_ids"],
                "attention_mask": encoded["attention_mask"]
            },
            training=False
        )

        start_logits = outputs[
            "start_logits"
        ][0]

        end_logits = outputs[
            "end_logits"
        ][0]

        # --------------------------------------------------
        # Determine which tokens belong to context
        # --------------------------------------------------

        sequence_ids = self.tokenizer(
            question,
            context,
            max_length=QA_MAX_LENGTH,
            truncation="only_second",
            padding="max_length"
        ).sequence_ids()

        context_token_indices = [
            index
            for index, sequence_id in enumerate(sequence_ids)
            if sequence_id == 1
        ]

        if not context_token_indices:
            return {
                "answer": "",
                "start": -1,
                "end": -1,
                "score": 0.0
            }

        # --------------------------------------------------
        # Restrict start/end predictions to context
        # --------------------------------------------------

        start_values = tf.gather(
            start_logits,
            context_token_indices
        )

        end_values = tf.gather(
            end_logits,
            context_token_indices
        )

        start_index = context_token_indices[
            int(tf.argmax(start_values).numpy())
        ]

        end_index = context_token_indices[
            int(tf.argmax(end_values).numpy())
        ]

        # --------------------------------------------------
        # Make sure end is not before start
        # --------------------------------------------------

        if end_index < start_index:

            best_start = None
            best_end = None
            best_score = float("-inf")

            max_answer_tokens = 30

            for start in context_token_indices:

                for end in context_token_indices:

                    if end < start:
                        continue

                    if end - start + 1 > max_answer_tokens:
                        break

                    score = (
                        float(
                            start_logits[start].numpy()
                        )
                        +
                        float(
                            end_logits[end].numpy()
                        )
                    )

                    if score > best_score:

                        best_score = score
                        best_start = start
                        best_end = end

            start_index = best_start
            end_index = best_end

        # --------------------------------------------------
        # Decode answer using token offsets
        # --------------------------------------------------

        offsets = offset_mapping[0].numpy()

        start_char = int(
            offsets[start_index][0]
        )

        end_char = int(
            offsets[end_index][1]
        )

        answer = context[
            start_char:end_char
        ]

        answer = self.normalize_answer(
            answer
        )

        start_score = float(
            start_logits[start_index].numpy()
        )

        end_score = float(
            end_logits[end_index].numpy()
        )

        # A simple confidence-like score.
        score = start_score + end_score

        return {
            "answer": answer,
            "start": start_char,
            "end": end_char,
            "score": score
        }


# IMPORTANT:
# Do NOT create QAService here.
#
# It will be created by main.py after FastAPI
# has already started.
qa_service = None