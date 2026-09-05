import re


# ============================================================
# CONFIG
# ============================================================

MAX_ANSWER_WORDS = 8
MIN_ANSWER_LENGTH = 2


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_answer(answer):
    answer = re.sub(r"\s+", " ", answer.strip())

    answer = answer.strip(
        " \t\n\r.,;:!?()[]{}\"'"
    )

    return answer


# ============================================================
# BASIC VALIDATION
# ============================================================

def is_valid_candidate(answer):
    answer = normalize_answer(answer)

    if len(answer) < MIN_ANSWER_LENGTH:
        return False

    words = answer.split()

    if len(words) > MAX_ANSWER_WORDS:
        return False

    # Reject obvious PDF fragments.
    if re.search(r"\b(?:Fig|Figure|Table|Eq)\.?\s*\d+\b", answer):
        return False

    # Reject strings that are almost entirely numbers.
    if re.fullmatch(r"[\d\s.,%/-]+", answer):
        # Allow years and simple meaningful numbers.
        if not re.fullmatch(r"(?:19|20)\d{2}", answer):
            return False

    # Must contain at least one letter or number.
    if not re.search(r"[A-Za-z0-9]", answer):
        return False

    return True


# ============================================================
# SENTENCE SPLITTING
# ============================================================

def split_sentences(text):
    """
    Split text while retaining reasonably natural sentences.
    """

    sentences = re.split(
        r"(?<=[.!?])\s+",
        text.strip()
    )

    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]


# ============================================================
# EXACT POSITION
# ============================================================

def find_all_occurrences(text, answer):
    """
    Find every exact occurrence of an answer.
    """

    positions = []

    start = 0

    while True:

        index = text.find(answer, start)

        if index == -1:
            break

        positions.append(
            (
                index,
                index + len(answer)
            )
        )

        start = index + 1

    return positions


# ============================================================
# CANDIDATE CREATION
# ============================================================

def make_candidate(text, answer, source="pattern"):

    answer = normalize_answer(answer)

    if not is_valid_candidate(answer):
        return None

    positions = find_all_occurrences(
        text,
        answer
    )

    if not positions:
        return None

    start, end = positions[0]

    return {
        "answer": answer,
        "start": start,
        "end": end,
        "source": source
    }


# ============================================================
# PATTERN EXTRACTION
# ============================================================

def extract_pattern_candidates(sentence):
    candidates = []

    # --------------------------------------------------------
    # 1. Quoted expressions
    # --------------------------------------------------------

    patterns = [
        r'"([^"]{2,100})"',
        r"'([^']{2,100})'"
    ]

    for pattern in patterns:

        for match in re.finditer(
            pattern,
            sentence
        ):

            candidate = normalize_answer(
                match.group(1)
            )

            if is_valid_candidate(candidate):
                candidates.append(
                    (candidate, "quoted")
                )

    # --------------------------------------------------------
    # 2. "is/was/are/were X"
    # --------------------------------------------------------

    copula_patterns = [
        r"\b(?:is|was|are|were)\s+"
        r"([A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z][A-Za-z0-9-]*){0,5})"
    ]

    for pattern in copula_patterns:

        for match in re.finditer(
            pattern,
            sentence,
            flags=re.IGNORECASE
        ):

            candidate = normalize_answer(
                match.group(1)
            )

            # Remove trailing clause words.
            candidate = re.split(
                r"\s+(?:that|which|who|and|but|while|"
                r"because|where|when)\b",
                candidate,
                maxsplit=1,
                flags=re.IGNORECASE
            )[0]

            if is_valid_candidate(candidate):
                candidates.append(
                    (candidate, "definition")
                )

    # --------------------------------------------------------
    # 3. "called / known as / named X"
    # --------------------------------------------------------

    patterns = [
        r"\b(?:called|known as|named)\s+"
        r"([A-Za-z0-9][A-Za-z0-9-]*(?:\s+[A-Za-z0-9][A-Za-z0-9-]*){0,5})"
    ]

    for pattern in patterns:

        for match in re.finditer(
            pattern,
            sentence,
            flags=re.IGNORECASE
        ):

            candidate = normalize_answer(
                match.group(1)
            )

            candidate = re.split(
                r"\s+(?:and|which|that|was|is|are|were)\b",
                candidate,
                maxsplit=1,
                flags=re.IGNORECASE
            )[0]

            if is_valid_candidate(candidate):
                candidates.append(
                    (candidate, "named")
                )

    # --------------------------------------------------------
    # 4. "developed/created/proposed by X"
    # --------------------------------------------------------

    patterns = [
        r"\b(?:developed by|created by|proposed by|"
        r"introduced by|designed by)\s+"
        r"([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,4})"
    ]

    for pattern in patterns:

        for match in re.finditer(
            pattern,
            sentence
        ):

            candidate = normalize_answer(
                match.group(1)
            )

            if is_valid_candidate(candidate):
                candidates.append(
                    (candidate, "person")
                )

    # --------------------------------------------------------
    # 5. Locations
    # --------------------------------------------------------

    patterns = [
        r"\b(?:located in|based in|born in|"
        r"founded in|held in|from)\s+"
        r"([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,4})"
    ]

    for pattern in patterns:

        for match in re.finditer(
            pattern,
            sentence
        ):

            candidate = normalize_answer(
                match.group(1)
            )

            if is_valid_candidate(candidate):
                candidates.append(
                    (candidate, "location")
                )

    # --------------------------------------------------------
    # 6. Years
    # --------------------------------------------------------

    for match in re.finditer(
        r"\b(?:19|20)\d{2}\b",
        sentence
    ):

        candidates.append(
            (
                match.group(0),
                "year"
            )
        )

    # --------------------------------------------------------
    # 7. Percentages
    # --------------------------------------------------------

    for match in re.finditer(
        r"\b\d+(?:\.\d+)?\s*%",
        sentence
    ):

        candidates.append(
            (
                match.group(0),
                "percentage"
            )
        )

    # --------------------------------------------------------
    # 8. Useful quantities
    # --------------------------------------------------------

    quantity_pattern = (
        r"\b\d+(?:\.\d+)?\s*"
        r"(?:million|billion|thousand|"
        r"papers|models|layers|tokens|parameters|"
        r"years|times|datasets|examples)\b"
    )

    for match in re.finditer(
        quantity_pattern,
        sentence,
        flags=re.IGNORECASE
    ):

        candidates.append(
            (
                normalize_answer(match.group(0)),
                "quantity"
            )
        )

    # --------------------------------------------------------
    # 9. Acronyms
    # --------------------------------------------------------

    for match in re.finditer(
        r"\b[A-Z]{2,}(?:-[A-Z0-9]+)*\b",
        sentence
    ):

        candidate = match.group(0)

        if is_valid_candidate(candidate):
            candidates.append(
                (candidate, "acronym")
            )

    # --------------------------------------------------------
    # 10. Technical hyphenated terms
    # --------------------------------------------------------

    for match in re.finditer(
        r"\b[A-Za-z]+(?:-[A-Za-z0-9]+)+\b",
        sentence
    ):

        candidate = match.group(0)

        if is_valid_candidate(candidate):
            candidates.append(
                (candidate, "technical")
            )

    return candidates


# ============================================================
# SCORE CANDIDATE
# ============================================================

def score_candidate(candidate):

    answer = candidate["answer"]
    source = candidate["source"]

    words = answer.split()

    score = 0.0

    # --------------------------------------------------------
    # Source quality
    # --------------------------------------------------------

    source_scores = {
        "quoted": 5.0,
        "definition": 4.0,
        "named": 4.5,
        "person": 5.0,
        "location": 4.5,
        "year": 3.0,
        "percentage": 3.0,
        "quantity": 4.0,
        "acronym": 2.5,
        "technical": 3.0
    }

    score += source_scores.get(
        source,
        1.0
    )

    # --------------------------------------------------------
    # Multi-word answers
    # --------------------------------------------------------

    if len(words) >= 2:
        score += 2.0

    if len(words) >= 3:
        score += 1.0

    # --------------------------------------------------------
    # Proper nouns
    # --------------------------------------------------------

    capitalized = sum(
        1
        for word in words
        if word[:1].isupper()
    )

    score += min(
        capitalized * 0.75,
        3.0
    )

    # --------------------------------------------------------
    # Penalize suspiciously long answers
    # --------------------------------------------------------

    if len(words) >= 7:
        score -= 1.5

    # --------------------------------------------------------
    # Penalize answer fragments
    # --------------------------------------------------------

    if answer.lower().startswith(
        (
            "the ",
            "a ",
            "an "
        )
    ):
        score -= 0.5

    return score


# ============================================================
# DEDUPLICATION
# ============================================================

def deduplicate_candidates(candidates):

    result = []
    seen = set()

    for candidate in candidates:

        key = re.sub(
            r"\s+",
            " ",
            candidate["answer"].lower().strip()
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(candidate)

    return result


# ============================================================
# REMOVE OVERLAPPING CANDIDATES
# ============================================================

def remove_bad_overlaps(candidates):

    result = []

    for candidate in candidates:

        keep = True

        for existing in result:

            a_start = candidate["start"]
            a_end = candidate["end"]

            b_start = existing["start"]
            b_end = existing["end"]

            overlaps = (
                a_start < b_end
                and b_start < a_end
            )

            if not overlaps:
                continue

            # If one is contained inside another,
            # prefer the more useful/shorter answer.
            if (
                a_start >= b_start
                and a_end <= b_end
            ):
                if len(candidate["answer"]) < len(
                    existing["answer"]
                ):
                    result.remove(existing)
                else:
                    keep = False

        if keep:
            result.append(candidate)

    return result


# ============================================================
# MAIN
# ============================================================

def get_answer_candidates(
    text,
    max_candidates=4
):
    """
    Generate up to max_candidates answer spans
    from one PDF chunk.
    """

    if not text or not text.strip():
        return []

    sentences = split_sentences(text)

    candidates = []

    for sentence in sentences:

        extracted = extract_pattern_candidates(
            sentence
        )

        for answer, source in extracted:

            candidate = make_candidate(
                text,
                answer,
                source
            )

            if candidate is not None:
                candidates.append(candidate)

    candidates = deduplicate_candidates(
        candidates
    )

    # Add score.
    for candidate in candidates:
        candidate["score"] = score_candidate(
            candidate
        )

    # Highest-quality first.
    candidates.sort(
        key=lambda item: item["score"],
        reverse=True
    )

    # Keep the strongest candidates.
    candidates = candidates[:max_candidates]

    return candidates