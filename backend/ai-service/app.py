"""Offline embedding adapter for the matching API.

Weights are loaded from the local Hugging Face cache or MATCHING_BGE_M3_PATH;
this service never downloads a model at startup.
"""

import os
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_ID = "BAAI/bge-m3"
PINNED_REVISION = "5617a9f61b028005a4858fdac845db406aefb181"
DEVICE = os.environ.get("MATCHING_BGE_M3_DEVICE", "cpu")
REVISION = os.environ.get("MATCHING_BGE_M3_REVISION", PINNED_REVISION)
CUSTOM_MODEL_PATH = os.environ.get("MATCHING_BGE_M3_PATH")
HF_CACHE = Path(
    os.environ.get("HF_HUB_CACHE")
    or os.environ.get("HUGGINGFACE_HUB_CACHE")
    or (Path(os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface")) / "hub")
)
MODEL_PATH = Path(CUSTOM_MODEL_PATH) if CUSTOM_MODEL_PATH else (
    HF_CACHE / "models--BAAI--bge-m3" / "snapshots" / REVISION
)

app = FastAPI(title="SPM local matching embeddings", version="1.0.0")


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=51)


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    try:
        if CUSTOM_MODEL_PATH and "MATCHING_BGE_M3_REVISION" not in os.environ:
            raise RuntimeError("A custom local model path requires MATCHING_BGE_M3_REVISION.")
        if not MODEL_PATH.is_dir():
            raise RuntimeError(f"Pinned model snapshot is not present in the local cache: {MODEL_PATH}")
        return SentenceTransformer(
            str(MODEL_PATH),
            device=DEVICE,
            local_files_only=True,
        )
    except Exception as error:  # Report model/cache issues without downloading or hiding them.
        raise RuntimeError(f"Unable to load local model {MODEL_PATH}: {error}") from error


@app.get("/health")
def health() -> dict[str, object]:
    try:
        model = get_model()
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {
        "ok": True,
        "model": MODEL_ID,
        "revision": REVISION,
        "dimension": model.get_embedding_dimension(),
        "device": str(model.device),
        "weightsSource": "local-only",
    }


@app.post("/v1/embeddings")
def embeddings(request: EmbeddingRequest) -> dict[str, object]:
    if any(not text.strip() or len(text) > 12000 for text in request.texts):
        raise HTTPException(status_code=422, detail="Texts must be non-empty and at most 12000 characters.")
    try:
        model = get_model()
        vectors = model.encode(
            request.texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Embedding inference failed: {error}") from error
    return {
        "model": MODEL_ID,
        "revision": REVISION,
        "normalized": True,
        "embeddings": vectors.tolist(),
    }
