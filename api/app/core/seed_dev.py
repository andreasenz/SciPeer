#!/usr/bin/env python3
"""
Dev seed script — idempotent, runs on every API startup in development.

Inserts:
  - 10 field categories
  - 10 seed authors (fake ORCID IDs) with one UNDER_REVIEW paper each
  - Co-author edges: seed_0 ↔ seed_1, seed_2 ↔ seed_3, seed_4 ↔ seed_5
  - For every real (non-seed) user who has logged in, creates a COI edge with
    seed_0 (Dr. Alice Chen).  This means you cannot review her paper — used to
    verify the COI gate on the review page.
"""

import asyncio
import logging

from sqlalchemy import select

from app.core.database import SessionFactory
from app.identity.models import User
from app.papers.models import (
    FieldCategory,
    PaperStatus,
    Submission,
    SubmissionAuthor,
    StatusHistory,
)
from app.reviews.models import CoauthorEdge

logger = logging.getLogger(__name__)

# ── Static seed data ──────────────────────────────────────────────────────────

# Fake ORCID IDs — all 19 chars, valid format, never issued by ORCID.org
SEED_ORCID_IDS = [f"0000-0001-1234-{str(i).zfill(4)}" for i in range(1, 11)]

FIELD_CATEGORIES = [
    ("Computer Science",      "computer-science"),
    ("Biology",               "biology"),
    ("Physics",               "physics"),
    ("Medicine",              "medicine"),
    ("Mathematics",           "mathematics"),
    ("Chemistry",             "chemistry"),
    ("Environmental Science", "environmental-science"),
    ("Psychology",            "psychology"),
    ("Economics",             "economics"),
    ("Linguistics",           "linguistics"),
]

SEED_AUTHORS = [
    ("Dr. Alice Chen",       "alice.chen@uni-cs.edu"),
    ("Prof. Bob Nakamura",   "b.nakamura@bio-institute.jp"),
    ("Dr. Carlos Reyes",     "c.reyes@phys.edu"),
    ("Dr. Fatima Al-Rashid", "f.rashid@medicine.org"),
    ("Prof. Elena Ivanova",  "e.ivanova@math.ru"),
    ("Dr. James Williams",   "j.williams@chem.uk"),
    ("Dr. Priya Patel",      "p.patel@envsci.in"),
    ("Prof. Marc Lefebvre",  "m.lefebvre@psych.fr"),
    ("Dr. Sarah Okonkwo",    "s.okonkwo@econ.ng"),
    ("Dr. Hans Mueller",     "h.mueller@linguistics.de"),
]

# (title, abstract, field_category_index)
SEED_PAPERS = [
    (
        "Attention Mechanisms in Low-Resource Neural Machine Translation",
        "We investigate the effectiveness of various attention mechanisms for neural machine "
        "translation in low-resource settings, focusing on 12 morphologically rich language "
        "pairs from the FLORES-200 benchmark. Results show that relative positional encodings "
        "outperform sinusoidal baselines by 2.3 BLEU points on agglutinative languages.",
        0,  # Computer Science
    ),
    (
        "CRISPR-Cas9 Off-Target Effects in Murine Hepatocytes: A Systematic Mapping",
        "Using whole-genome sequencing on 847 edited samples, we construct the first "
        "comprehensive off-target atlas for liver-targeted CRISPR therapeutics. Our data "
        "reveal a strong positional bias of off-target events near transcriptionally active "
        "chromatin regions.",
        1,  # Biology
    ),
    (
        "Quantum Error Correction via Topological Codes in Noisy Intermediate-Scale Devices",
        "We demonstrate a 34% reduction in logical error rate by adapting surface codes to "
        "the specific noise characteristics of superconducting qubit arrays. Experiments were "
        "conducted on a 127-qubit device with an average gate fidelity of 99.5%.",
        2,  # Physics
    ),
    (
        "Social Determinants of Antibiotic Resistance Spread in Urban Hospital Networks",
        "Epidemiological network analysis of 23 hospitals reveals that staff mobility patterns "
        "account for 61% of resistant strain dissemination across facilities. Targeted "
        "cohorting interventions reduced cross-hospital transmission by 44%.",
        3,  # Medicine
    ),
    (
        "Riemannian Gradient Flows for Optimal Transport in Infinite Dimensions",
        "We establish convergence guarantees for gradient flow discretisations of the "
        "Wasserstein distance in infinite-dimensional Hilbert spaces. The analysis covers "
        "both the continuity equation and the Jordan-Kinderlehrer-Otto scheme.",
        4,  # Mathematics
    ),
    (
        "Catalytic Asymmetric Synthesis of Spirocyclic Oxindoles via Organocatalysis",
        "We report a highly enantioselective organocatalytic approach to spirocyclic oxindoles "
        "using bifunctional thiourea catalysts, achieving up to 98% ee and 95% yield across "
        "24 substrate variants with broad functional group tolerance.",
        5,  # Chemistry
    ),
    (
        "Urban Heat Island Mitigation Through Green Infrastructure: A Meta-Analysis",
        "A systematic meta-analysis of 147 studies quantifies the cooling effect of urban "
        "green infrastructure. Median temperature reductions of 2.1°C are observed for "
        "green roofs, with larger effects (3.4°C) for street-level urban forests.",
        6,  # Environmental Science
    ),
    (
        "Cognitive Load and Working Memory Capacity in Dual-Task Paradigms",
        "We present new evidence for the domain-general theory of working memory using a "
        "novel dual-task paradigm combining verbal and visuospatial processing demands. "
        "Individual differences in capacity predict dual-task interference with r = 0.61.",
        7,  # Psychology
    ),
    (
        "Market Microstructure Dynamics Under High-Frequency Trading Regulation",
        "Using regulatory discontinuities across exchanges, we estimate the causal effect "
        "of HFT speed limits on bid-ask spreads and price discovery efficiency. Speed bumps "
        "reduce informed trading by 18% while increasing market-maker rents.",
        8,  # Economics
    ),
    (
        "Prosodic Bootstrapping in Child Language Acquisition Across Typologically Diverse Languages",
        "Cross-linguistic data from 8 typologically diverse languages challenge the universality "
        "of prosodic bootstrapping as a mechanism for early syntactic acquisition. Head-final "
        "languages show delayed bootstrapping onset by an average of 2.3 months.",
        9,  # Linguistics
    ),
]

# Co-author pairs among seed users (bidirectional).  Index into SEED_ORCID_IDS.
SEED_COAUTHOR_PAIRS = [(0, 1), (2, 3), (4, 5)]


# ── Main seed function ────────────────────────────────────────────────────────

async def seed() -> None:
    async with SessionFactory() as session:

        # 1. Field categories ─────────────────────────────────────────────────
        existing_slugs = {
            row.slug
            for row in (await session.execute(select(FieldCategory.slug))).all()
        }
        new_fields = [
            FieldCategory(name=name, slug=slug, coi_depth=2)
            for name, slug in FIELD_CATEGORIES
            if slug not in existing_slugs
        ]
        if new_fields:
            session.add_all(new_fields)
            await session.flush()
            logger.info("seed: created %d field categories", len(new_fields))

        # Map slug → FieldCategory for paper creation
        all_fields = (await session.execute(select(FieldCategory))).scalars().all()
        slug_to_field = {f.slug: f for f in all_fields}
        ordered_fields = [slug_to_field[slug] for _, slug in FIELD_CATEGORIES]

        # 2. Seed users ───────────────────────────────────────────────────────
        existing_orcids = {
            row.orcid_id
            for row in (await session.execute(select(User.orcid_id))).all()
        }
        new_users = [
            User(orcid_id=SEED_ORCID_IDS[i], display_name=SEED_AUTHORS[i][0], email=SEED_AUTHORS[i][1])
            for i in range(len(SEED_ORCID_IDS))
            if SEED_ORCID_IDS[i] not in existing_orcids
        ]
        if new_users:
            session.add_all(new_users)
            await session.flush()
            logger.info("seed: created %d seed users", len(new_users))

        # Reload to get IDs
        seed_users = (
            await session.execute(select(User).where(User.orcid_id.in_(SEED_ORCID_IDS)))
        ).scalars().all()
        by_orcid = {u.orcid_id: u for u in seed_users}
        ordered_seeds = [by_orcid[oid] for oid in SEED_ORCID_IDS]

        # 3. Seed papers (one per author, UNDER_REVIEW) ───────────────────────
        papers_created = 0
        for i, (title, abstract, field_idx) in enumerate(SEED_PAPERS):
            author = ordered_seeds[i]
            # Skip if this seed author already has a paper
            existing = (
                await session.execute(
                    select(SubmissionAuthor).where(SubmissionAuthor.user_id == author.id)
                )
            ).scalar_one_or_none()
            if existing is not None:
                continue

            sub = Submission(
                title=title,
                abstract=abstract,
                field_category_id=ordered_fields[field_idx].id,
                status=PaperStatus.UNDER_REVIEW,
                pdf_url="",
            )
            session.add(sub)
            await session.flush()
            session.add(SubmissionAuthor(submission_id=sub.id, user_id=author.id, position=0))
            session.add(StatusHistory(
                submission_id=sub.id,
                from_status=None,
                to_status=PaperStatus.UNDER_REVIEW,
                actor_id=author.id,
            ))
            papers_created += 1

        if papers_created:
            await session.flush()
            logger.info("seed: created %d seed papers", papers_created)

        # 4. Co-author edges between seed users ───────────────────────────────
        edges_created = 0
        for a_idx, b_idx in SEED_COAUTHOR_PAIRS:
            ua, ub = ordered_seeds[a_idx], ordered_seeds[b_idx]
            for x, y in ((ua.id, ub.id), (ub.id, ua.id)):
                exists = (
                    await session.execute(
                        select(CoauthorEdge).where(
                            CoauthorEdge.author_id == x,
                            CoauthorEdge.coauthor_id == y,
                        )
                    )
                ).scalar_one_or_none()
                if exists is None:
                    session.add(CoauthorEdge(author_id=x, coauthor_id=y))
                    edges_created += 1

        if edges_created:
            await session.flush()
            logger.info("seed: created %d seed co-author edges", edges_created)

        # 5. COI edge: real logged-in user ↔ seed_0 ───────────────────────────
        # Any non-seed user who has logged in becomes a co-author of Dr. Alice Chen
        # (seed_0), which means they cannot review her paper — COI gate test.
        seed_0 = ordered_seeds[0]
        real_users = (
            await session.execute(
                select(User).where(User.orcid_id.not_in(SEED_ORCID_IDS))
            )
        ).scalars().all()

        for real_user in real_users:
            for x, y in ((real_user.id, seed_0.id), (seed_0.id, real_user.id)):
                exists = (
                    await session.execute(
                        select(CoauthorEdge).where(
                            CoauthorEdge.author_id == x,
                            CoauthorEdge.coauthor_id == y,
                        )
                    )
                ).scalar_one_or_none()
                if exists is None:
                    session.add(CoauthorEdge(author_id=x, coauthor_id=y))
                    logger.info(
                        "seed: COI edge created — %s ↔ %s (seed_0)",
                        real_user.display_name,
                        seed_0.display_name,
                    )

        await session.commit()
        logger.info("seed: dev seed complete")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    asyncio.run(seed())
