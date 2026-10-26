"""Deterministic lexical retrieval. Scores do not establish evidence coverage."""
from __future__ import annotations
import math
import re
from collections import Counter
from . import governance as rsi
from .model import Card, UNROUTED

TOKEN = re.compile(r"[a-z0-9][a-z0-9_.+#-]*|[\u3400-\u9fff]+")


WEIGHTS = (("title", 3), ("summary", 3), ("when", 3), ("triggers", 3), ("tags", 2))


def tokens(text: str) -> list[str]:
    out: list[str] = []
    for run in TOKEN.findall(text.lower().replace("/", " ")):
        if run[0].isascii():
            out.append(run)
        else:  # CJK: bigrams carry far more meaning than single characters
            out += [run] if len(run) == 1 else [run[i:i + 2] for i in range(len(run) - 1)]
    return out


def card_tokens(card: Card) -> Counter:
    bag = Counter(tokens(rsi.current_body(card.body)))
    for key, weight in WEIGHTS:
        for token in tokens(" ".join(card.items(key))):
            bag[token] += weight
    return bag


def rank(cards: list[Card], query: str, k: int = 5, include_stale: bool = False) -> list[tuple[float, Card]]:
    docs = [(card, card_tokens(card)) for card in cards
            if (card.kind, card.state) not in UNROUTED and (include_stale or card.routed)]
    if not docs:
        return []
    lengths = [sum(bag.values()) for _, bag in docs]
    average = sum(lengths) / len(docs)
    df = Counter(token for _, bag in docs for token in bag)
    terms = set(tokens(query))
    results = []
    for (card, bag), length in zip(docs, lengths):
        score = sum(math.log(1 + (len(docs) - df[t] + 0.5) / (df[t] + 0.5)) * bag[t] * 2.5
                    / (bag[t] + 1.5 * (0.25 + 0.75 * length / average)) for t in terms if t in bag)
        if score > 0:
            results.append((score, card))
    def order(hit):
        score, card = hit
        signal = rsi.summary(card.meta, card.body)
        return (-score, signal["rsi_status"] != "verified", -signal["utility_score"], card.id.lower())
    return sorted(results, key=order)[:k]


def card_record(card: Card) -> dict:
    """Expose provenance and applicability without inferring evidence strength."""
    return {
        "id": card.id, "kind": card.kind, "path": f"{card.path}.md",
        "title": card.text("title"), "summary": card.text("summary"),
        "tags": card.items("tags"), "when": card.items("when"),
        "not_when": card.items("not_when"), "state": card.state,
        "evidence": card.text("evidence"), "source": card.items("source"),
        "url": card.text("url"), "created": card.text("created"),
        "verified": card.text("verified"), "updated": card.text("updated"),
        **rsi.summary(card.meta, card.body),
    }


FIND_NOTICE = "命中仅为词面相关候选；覆盖须读卡片或原文确认，无命中不等于库内无知识。"


def find_needs(cards: list[Card], query: str, needs: list[str], k: int = 5, include_stale: bool = False) -> dict:
    """Retrieve each self-contained requirement; do not claim semantic coverage."""
    requirements = []
    candidates = {}
    for index, need in enumerate(needs, 1):
        hits = rank(cards, need, k, include_stale)
        references = []
        for score, card in hits:
            record = card_record(card)
            candidates.setdefault(record["path"], record)
            references.append({"path": record["path"], "score": round(score, 2)})
        requirements.append({
            "id": f"N{index}", "query": need, "coverage": "unassessed",
            "retrieval_status": "candidates_found" if hits else "no_lexical_match",
            "hits": references,
        })
    return {"query": query, "requirements": requirements,
            "candidates": list(candidates.values()), "notice": FIND_NOTICE}
