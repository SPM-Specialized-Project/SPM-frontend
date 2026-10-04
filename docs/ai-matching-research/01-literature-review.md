# Literature review: AI-assisted Student–Tutor recommendations

This review records what each source reports separately from what this project chooses to build. A result in another institution, population, or dataset is not a measured result for HCMUT.

## 1. Tutoring recommender systems and academic competence

### Achón et al. (2024), diversity-aware tutoring recommendations [1]

**SOURCE SAYS:** The authors describe the SOS TUTORÍA UC student-tutoring application, emphasize academic competence and user-selected personality similarity/difference/indifference, and report positive testing for competence while identifying personality as an area for improvement. Their system integrates with WeNet services.

**OUR DESIGN DECISION:** Treat academic competence as a structured, evidence-backed tutor profile field. Do not copy a Big Five/personality feature into this system: the repository has no such data, and the source's context-specific preference is not a justified proxy for tutor quality here.

## 2. Peer tutor recommendation

### Ma, Hwang, and Shih (2020), peer tutor recommender system [2]

**SOURCE SAYS:** This vocational-school study combines a peer tutor recommender with automated assessment and discusses social relationships, learning performance, recommendation feedback, and student outcomes in its own learning-by-doing setting.

**OUR DESIGN DECISION:** This is evidence that peer-tutor recommendation has been studied as a broader learning intervention, not evidence that HCMUT has the same signals or outcomes. The current repository has no compatible social graph, assessment-derived competence, or verified outcome history; do not synthesize these features.

## 3. Mentor–mentee profile matching

### Pham et al. (2023), fuzzy profile matching [3]

**SOURCE SAYS:** The paper proposes mentor/mentee profiles, expressed preferences and expert knowledge, using fuzzy definitions together with a maximal-length matching algorithm; its abstract reports tests in its own system.

**OUR DESIGN DECISION:** Use explicit profile dimensions and coordinator review. Fuzzy logic is not selected for the MVP because the app lacks calibrated fuzzy membership functions and domain-validated rules. The paper does not validate the weights or thresholds proposed for this repository.

### Haas, Hall, and Vlasnik (2018), applied two-sided matching [4]

**SOURCE SAYS:** Their higher-education case study models preferences on both sides, including avoid preferences, and compares algorithms/heuristics for forming a set of mentor–mentee matches.

**OUR DESIGN DECISION:** Keep per-student Top-K recommendation distinct from a later global allocation problem. Tutor-side preference and avoid data are absent, so this project is not currently a reciprocal/stable-matching market. Do not run a two-sided stable matching algorithm without both sides' meaningful preferences and a product requirement for stability.

## 4. Reciprocal recommendation

### Palomares et al. (2021), reciprocal recommender systems [5]

**SOURCE SAYS:** This literature review distinguishes reciprocal systems, where people can be both recommenders and recommendation targets, from one-way user-to-item recommendation and surveys preference/fusion approaches.

**OUR DESIGN DECISION:** Keep tutor preferences out of the MVP score until tutors can express meaningful, consented preferences about student requests. If that data is added, evaluate a reciprocal compatibility function as a separate design; do not treat a tutor's free-text teaching description as a preference for a particular student.

## 5. Text-based advisor recommendation and sentence embeddings

### Wang et al. (2025), text-based academic-advisor recommendation [6]

**SOURCE SAYS:** The article builds an advisor recommendation model from teacher-related text and student demand text, using BERT/SimCSE sentence representations and similarity-based ranking. It constructs a validation set from questionnaire data and notes the challenge of obtaining high-quality student data and the relatively small dataset in its own study.

**OUR DESIGN DECISION:** This is a close precedent for comparing short student requests with tutor expertise text. Its corpus, labels, language, institution and reported performance do not establish expected HCMUT accuracy. Build and label a local benchmark before selecting a model.

### Term weighting and TF-IDF baseline [17]

**SOURCE SAYS:** Salton and Buckley compare term-weighting approaches for automatic text retrieval, including TF-IDF-style weighting, in an information-retrieval setting.

**OUR DESIGN DECISION:** Keep sparse TF-IDF with word/bigram cosine as a simple lexical baseline that can run inside the existing Node backend. It is not a semantic model and the paper does not imply it is suitable or optimal for tutor matching.

### Sentence-BERT (Reimers & Gurevych, 2019) [7]

**SOURCE SAYS:** SBERT uses siamese/triplet sentence encoders to create sentence vectors that can be compared with cosine similarity, enabling efficient semantic similarity search.

**OUR DESIGN DECISION:** Compare multilingual embeddings as a semantic feature; cosine similarity is a ranking signal, not a probability of a successful tutoring relationship.

### LaBSE (Feng et al., 2022) and M3-Embedding (Chen et al., 2024) [8, 9]

**SOURCE SAYS:** LaBSE reports a multilingual sentence-embedding model for 109+ languages and evaluates bitext retrieval; M3-Embedding describes dense, sparse, and multi-vector retrieval across 100+ languages. These are model-level research results on the papers' benchmarks.

**OUR DESIGN DECISION:** Use BGE-M3 dense vectors as one multilingual baseline and retain a provider interface. Do not claim it is the best Vietnamese tutoring model. The project-specific test set and runtime constraints decide deployment suitability.

**SOURCE SAYS (official model artifact):** The BAAI model card identifies `BAAI/bge-m3`, documents `SentenceTransformer.encode` and cosine-similarity usage, and the referenced repository commit is available as a versioned artifact [16]. This supports the adapter interface and version pin only; it does not establish HCMUT performance.

### MTEB and Vietnamese Context Search (VCS) [10, 11]

**SOURCE SAYS:** MTEB covers multiple embedding tasks/languages and reports that no one embedding method dominates all tasks; its paper notes limitations in multilingual retrieval coverage. VCS introduces Vietnamese retrieval/reranking tasks, including domain datasets, to evaluate Vietnamese embedding systems.

**OUR DESIGN DECISION:** External embedding leaderboards can shortlist candidates but cannot substitute for HCMUT tutor-request judgments. VCS is a useful Vietnamese-language smoke benchmark, not an education-specific ground truth.

## 6. Batch allocation: maximum-weight capacitated bipartite matching

### Network-flow formulation [12]

**SOURCE SAYS:** Ahuja, Magnanti, and Orlin provide an authoritative treatment of assignment, matching, and minimum-cost flow formulations and algorithms.

**OUR DESIGN DECISION:** Do not solve a global batch assignment in the first recommendation slice. If/when requested, build a bipartite flow network with student capacity one, tutor-to-sink capacity equal to verified tutor capacity, infeasible edges removed by the hard mask, and edge cost derived from the validated ranking objective. Review the unmatched option and fairness objective before optimizing total score. This project does not need Gale–Shapley unless both sides' preference orders and stability are requirements.

## 7. Learning to rank and rank-aware evaluation

### Cao et al. (2007) and Järvelin & Kekäläinen (2002) [13, 14]

**SOURCE SAYS:** Learning-to-rank research trains ranking functions from labeled relevance/order data; the cited pairwise/listwise work studies those approaches in information retrieval. Järvelin and Kekäläinen introduce cumulative-gain measures that account for graded relevance and rank position.

**OUR DESIGN DECISION:** Begin with a named, interpretable equal-weight heuristic over available features. Train pairwise ranking only after coordinator choices/rejections have been collected with sufficient quality and reviewed for selection/exposure bias. Use graded offline relevance labels and nDCG@K alongside Precision@K, Recall@K, MRR, MAP@K and HitRate@K. No metric result is asserted until an HCMUT benchmark is labeled and run.

## 8. Trustworthiness, review, and privacy

### NIST AI RMF 1.0 [15]

**SOURCE SAYS:** NIST frames trustworthy AI around validity/reliability, safety, security/resilience, accountability/transparency, explainability, privacy, and fairness, with risk management throughout the system lifecycle.

**OUR DESIGN DECISION:** Keep hard eligibility in the backend, retain versioned recommendation evidence, show deterministic reasons, provide Coordinator override, and gate any third-party inference use on a separate privacy/security decision. This is an engineering application of the framework, not a claim of legal compliance.

## References

1. L. Achón, A. De Souza, A. Hume, and L. Cernuzzi. “A diversity-aware recommendation system for tutoring.” *AI Communications*, 37(4), 711–733, 2024. [DOI: 10.3233/AIC-230434](https://doi.org/10.3233/AIC-230434).
2. Z. H. Ma, W. Y. Hwang, and T. K. Shih. “Effects of a peer tutor recommender system (PTRS) with machine learning and automated assessment on vocational high school students’ computer application operating skills.” *Journal of Computers in Education*, 7(3), 435–462, 2020. [DOI: 10.1007/s40692-020-00162-9](https://doi.org/10.1007/s40692-020-00162-9).
3. H. V. Pham et al. “Mentor and mentee matching: Using fuzzy logic with a maximal length matching algorithm, expressed preferences, and expert knowledge.” *Journal of Intelligent & Fuzzy Systems*, 45(3), 4071–4087, 2023. [DOI: 10.3233/JIFS-223820](https://doi.org/10.3233/JIFS-223820).
4. C. Haas, M. Hall, and S. Vlasnik. “Finding optimal mentor-mentee matches: A case study in applied two-sided matching.” *Heliyon*, 4(6), e00634, 2018. [DOI: 10.1016/j.heliyon.2018.e00634](https://doi.org/10.1016/j.heliyon.2018.e00634).
5. I. Palomares, C. Porcel, L. Pizzato, I. Guy, and E. Herrera-Viedma. “Reciprocal Recommender Systems: Analysis of state-of-art literature, challenges and opportunities towards social recommendation.” *Information Fusion*, 69, 103–127, 2021. [DOI: 10.1016/j.inffus.2020.12.001](https://doi.org/10.1016/j.inffus.2020.12.001).
6. X. Wang, J. Zhou, L. Jian, Y. Yin, and L. Li. “Empowering college students to select ideal advisors: a text-based recommendation model.” *Frontiers in Education*, 10:1673956, 2025. [DOI: 10.3389/feduc.2025.1673956](https://doi.org/10.3389/feduc.2025.1673956).
7. N. Reimers and I. Gurevych. “Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks.” *EMNLP-IJCNLP 2019*, 3982–3992. [DOI: 10.18653/v1/D19-1410](https://doi.org/10.18653/v1/D19-1410).
8. F. Feng, Y. Yang, D. Cer, N. Arivazhagan, and W. Wang. “Language-agnostic BERT Sentence Embedding.” *ACL 2022*, 878–891. [DOI: 10.18653/v1/2022.acl-long.62](https://doi.org/10.18653/v1/2022.acl-long.62).
9. J. Chen, S. Xiao, P. Zhang, K. Luo, D. Lian, and Z. Liu. “M3-Embedding: Multi-Linguality, Multi-Functionality, Multi-Granularity Text Embeddings Through Self-Knowledge Distillation.” *Findings of ACL 2024*, 2318–2335. [DOI: 10.18653/v1/2024.findings-acl.137](https://doi.org/10.18653/v1/2024.findings-acl.137).
10. N. Muennighoff, N. Tazi, L. Magne, and N. Reimers. “MTEB: Massive Text Embedding Benchmark.” *EACL 2023*, 2014–2037. [DOI: 10.18653/v1/2023.eacl-main.148](https://doi.org/10.18653/v1/2023.eacl-main.148).
11. V. Nguyen, N. Tran, L. Nguyen, and D. Dinh. “Advancing Vietnamese Information Retrieval with Learning Objective and Benchmark.” *PACLIC 2024*, 46–56. [ACL Anthology](https://aclanthology.org/2024.paclic-1.5/).
12. R. K. Ahuja, T. L. Magnanti, and J. B. Orlin. *Network Flows: Theory, Algorithms, and Applications.* Prentice Hall, 1993. [Publisher record](https://www.pearson.com/en-us/subject-catalog/p/network-flows-theory-algorithms-and-applications/P200000003456).
13. Z. Cao, T. Qin, T.-Y. Liu, M.-F. Tsai, and H. Li. “Learning to Rank: From Pairwise Approach to Listwise Approach.” *ICML 2007*, 129–136. [DOI: 10.1145/1273496.1273513](https://doi.org/10.1145/1273496.1273513).
14. K. Järvelin and J. Kekäläinen. “Cumulated gain-based evaluation of IR techniques.” *ACM Transactions on Information Systems*, 20(4), 422–446, 2002. [DOI: 10.1145/582415.582418](https://doi.org/10.1145/582415.582418).
15. E. Tabassi. *Artificial Intelligence Risk Management Framework (AI RMF 1.0).* NIST AI 100-1, 2023. [DOI: 10.6028/NIST.AI.100-1](https://doi.org/10.6028/NIST.AI.100-1).
16. BAAI. *bge-m3 model card and files*, repository `BAAI/bge-m3`, commit [`5617a9f61b028005a4858fdac845db406aefb181`](https://huggingface.co/BAAI/bge-m3/tree/5617a9f61b028005a4858fdac845db406aefb181). Accessed 2026-10-02.
17. G. Salton and C. Buckley. “Term-weighting approaches in automatic text retrieval.” *Information Processing & Management*, 24(5), 513–523, 1988. [DOI: 10.1016/0306-4573(88)90021-0](https://doi.org/10.1016/0306-4573(88)90021-0).
