# Local BGE-M3 embedding adapter

This optional service provides multilingual dense embeddings to the Node matching API. It resolves the exact snapshot directory for `BAAI/bge-m3` revision `5617a9f61b028005a4858fdac845db406aefb181` from the local cache and passes that local directory to Sentence Transformers. It fails when the snapshot is absent; it does not look up a model name or download weights at runtime. The revision was verified in the official [model repository](https://huggingface.co/BAAI/bge-m3/tree/5617a9f61b028005a4858fdac845db406aefb181). A custom local path must identify that same snapshot or provide an explicit matching `MATCHING_BGE_M3_REVISION`. The model is an embedding encoder, not a tutor-matching model trained on HCMUT outcomes.

The direct dependency versions are pinned to the environment used for the local adapter smoke run; transitive dependencies are not yet frozen in a lockfile. From the repository root, install the listed Python dependencies in an isolated environment, then start the adapter:

```powershell
$env:MATCHING_BGE_M3_DEVICE = 'cpu'
python -m uvicorn app:app --app-dir backend/ai-service --host 127.0.0.1 --port 8101
```

Set `MATCHING_EMBEDDING_URL=http://127.0.0.1:8101` for the Node backend. If overriding the pinned default revision, set `MATCHING_BGE_M3_REVISION` to the same commit for both processes. Check `GET /health` before selecting `BGE_M3` in the coordinator view. The default matching model is the deterministic TF-IDF word/bigram baseline. An unavailable BGE service returns an explicit API error; the backend does not silently substitute another model.

The API sends only student/tutor request text for hard-eligible pairs. Do not bind this adapter to a public interface without an authenticated deployment design. The current local adapter does not retain request text or vectors.
