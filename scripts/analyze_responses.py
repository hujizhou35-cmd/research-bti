"""Reproduce aggregate pilot findings from an owner-supplied, private D1 snapshot.

Never writes respondent-level data into the public output directory. Individual
exclusion reasons are written only to --private-dir. No database access or deletion.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

import numpy as np

SEED = 20261015
REPLICATES = 2000
DIMS = ("CX", "OA", "PR", "TW")
POLES = (("C", "X"), ("O", "A"), ("P", "R"), ("T", "W"))
# Server-side completion times locate deployment eras, not independently verified
# respondent identities. Sessions crossing a revision boundary remain unknown.
V5_DEPLOYED = "2026-06-28T01:15:38.989625Z"
REVISION_DEPLOYED = "2026-06-30T05:26:58.693906Z"


def timestamp(value):
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt if dt.tzinfo else None
    except (ValueError, TypeError):
        return None


def alpha(values):
    x = np.asarray(values, dtype=float)
    if x.ndim != 2 or x.shape[0] < 2 or x.shape[1] < 2:
        return None
    total_var = np.var(x.sum(axis=1), ddof=1)
    if not np.isfinite(x).all() or not np.isfinite(total_var) or total_var <= 0:
        return None
    k = x.shape[1]
    return float(k / (k - 1) * (1 - np.var(x, axis=0, ddof=1).sum() / total_var))


def reliability(values):
    estimate = alpha(values)
    if estimate is None:
        return {"alpha": None, "ci95": None, "reason": "Fewer than two complete responses, or zero/invalid total-score variance."}
    rng = np.random.default_rng(SEED)
    x = np.asarray(values, dtype=float)
    draws = [alpha(x[rng.integers(0, len(x), len(x))]) for _ in range(REPLICATES)]
    finite = [v for v in draws if v is not None]
    # A CI conditional on dropping degenerate replicates can be misleading. Keep
    # the estimate but do not publish a partial bootstrap interval.
    ci = np.quantile(finite, [.025, .975]).tolist() if len(finite) == REPLICATES else None
    return {"alpha": estimate, "ci95": ci, "bootstrap_valid": len(finite), "bootstrap_total": REPLICATES,
            "reason": None if ci else "At least one bootstrap replicate had zero/invalid total-score variance; interval not reported."}


def revision(row):
    end, consent = timestamp(row.get("created_at")), timestamp(row.get("consent_at"))
    if row.get("questions_version") != "2.1" or not end or not consent:
        return "unknown"
    if end < timestamp(V5_DEPLOYED) or consent > end:
        return "unknown"
    if end < timestamp(REVISION_DEPLOYED):
        return "pre-June-30-deployment"
    if consent >= timestamp(REVISION_DEPLOYED):
        return "post-June-30-deployment"
    return "unknown"


def longest_run(positions):
    longest = run = 0
    previous = None
    for p in positions:
        run = run + 1 if p == previous else 1
        previous = p
        longest = max(longest, run)
    return longest


def prepare(rows, questions, exclusions):
    def require(condition):
        if not condition:
            raise ValueError('Invalid response')
    prepared = []
    for row in rows:
        r = dict(row)
        r["revision"] = revision(r)
        r["flags"] = []
        r["notes"] = []
        if r.get("id") in exclusions.get("ids", []) or r.get("client_id") in exclusions.get("clientIds", []):
            r["flags"].append("known_test")
        if r.get("mode") not in ("fun", "strict") or r.get("questions_version") != "2.1":
            r["flags"].append("unsupported_mode_or_version")
        items = [q for q in questions if r.get("mode") != "fun" or q["priority"] == 1]
        try:
            answers = json.loads(r["answers"])
            require(isinstance(answers, dict) and set(answers) == {str(q["id"]) for q in items})
            for q in items:
                a = answers[str(q["id"])]
                require(type(a["v"]) is int and a["v"] in range(5))
                require(type(a["flipped"]) is bool)
                require(a["pos"] == "ABCDE"[a["v"] if a["flipped"] else 4 - a["v"]])
                require(a["pole"] == next(o["pole"] for o in q["options"] if o["value"] == a["v"]))
            r["answers_parsed"] = answers
            r["scores"] = []
            for dim in DIMS:
                values = [answers[str(q["id"])]["v"] for q in items if q["dimension"] == dim]
                score = sum(values) / (4 * len(values)) * 10
                r["scores"].append(score)
                require(abs(score - float(r["strength_" + dim.lower()])) < 1e-8)
            require(r["code"] == "".join(pair[0 if score > 5 else 1] for pair, score in zip(POLES, r["scores"])))
        except (KeyError, TypeError, ValueError, AssertionError, ZeroDivisionError, StopIteration):
            r["flags"].append("invalid_or_inconsistent_response")
            prepared.append(r)
            continue
        if not r.get("consent_version") or not timestamp(r.get("consent_at")):
            r["flags"].append("missing_or_invalid_consent")
        if r.get("turnstile") == "fail":
            r["flags"].append("captcha_fail")
        if r.get("self_report") == "careless":
            r["flags"].append("self_report_careless")
        positions = [answers[str(q["id"])]["pos"] for q in items]
        r["straight_main"] = max(Counter(positions).values()) / len(items) > .8 or longest_run(positions) >= len(items) * .8
        r["straight_legacy"] = max(Counter(positions).values()) / len(items) > .7 or longest_run(positions) >= len(items) * .6
        times = [answers[str(q["id"])].get("t") for q in items]
        complete_times = all(type(t) in (int, float) and np.isfinite(t) and t >= 0 for t in times)
        total = r.get("duration_ms")
        total_available = type(total) in (int, float) and np.isfinite(total) and total >= 0
        speed_tests = []
        if total_available:
            speed_tests.append(total < len(items) * 1500)
        if complete_times:
            speed_tests.extend([np.median(times) < 2000, np.mean(np.array(times) < 1000) > .5])
        if sum(speed_tests) >= 2:
            r["flags"].append("speed_two_or_more")
        if not complete_times or not total_available:
            r["notes"].append("timing_incomplete")
        if r.get("turnstile") in (None, "", "absent", "disabled"):
            r["notes"].append("captcha_" + (r.get("turnstile") or "unrecorded"))
        if r.get("self_report") == "partial":
            r["notes"].append("self_report_partial")
        if not r.get("locale"):
            r["notes"].append("language_unrecorded")
        prepared.append(r)
    # Browser-level deduplication, not a count of unique people. Missing browser
    # identifiers remain separate. Invalid submissions never displace a valid one.
    seen = set()
    for r in sorted(prepared, key=lambda x: (x.get("created_at", ""), x.get("id", ""))):
        if any(flag in r["flags"] for flag in ("known_test", "unsupported_mode_or_version", "invalid_or_inconsistent_response", "missing_or_invalid_consent")):
            continue
        client = r.get("client_id")
        key = (client, r.get("mode"), r["revision"])
        if client and key in seen:
            r["flags"].append("repeat_browser_within_mode_revision")
        elif client:
            seen.add(key)
    return prepared


def describe(rows):
    result = {"n": len(rows), "types": dict(sorted(Counter(r["code"] for r in rows).items())), "dimensions": {}}
    for i, dim in enumerate(DIMS):
        x = np.array([r["scores"][i] for r in rows], dtype=float)
        result["dimensions"][dim] = {"mean": float(x.mean()) if len(x) else None,
            "sd": float(x.std(ddof=1)) if len(x) > 1 else None,
            "median": float(np.median(x)) if len(x) else None,
            "q1": float(np.quantile(x, .25)) if len(x) else None,
            "q3": float(np.quantile(x, .75)) if len(x) else None}
    return result


def run(snapshot, manifest, private_dir, output):
    repo = Path(__file__).resolve().parents[1]
    raw = snapshot.read_bytes()
    metadata = json.loads(manifest.read_text(encoding="utf-8-sig"))
    if hashlib.sha256(raw).hexdigest() != metadata["sha256"]:
        raise ValueError("Snapshot hash does not match its manifest")
    rows = json.loads(raw)
    questions = json.loads((repo / "data/questionsv5.json").read_text(encoding="utf-8-sig"))["questions"]
    exclusion_path = private_dir / "analysis-exclusions.private.json"
    exclusions = json.loads(exclusion_path.read_text()) if exclusion_path.exists() else {}
    prepared = prepare(rows, questions, exclusions)
    modes = {}
    for mode in ("fun", "strict"):
        source = [r for r in prepared if r.get("mode") == mode]
        base = [r for r in source if not r["flags"]]
        main = [r for r in base if not r["straight_main"]]
        modes[mode] = {"received": len(source), "main": describe(main), "revision_counts": dict(Counter(r["revision"] for r in main)),
            "exclusion_flags_overlapping": dict(Counter(flag for r in source for flag in r["flags"])),
            "straight_main_flagged": sum(bool(r.get("straight_main")) for r in base),
            "notes_overlapping": dict(Counter(note for r in main for note in r["notes"])),
            "sensitivity": {"legacy_straight_thresholds": describe([r for r in base if not r["straight_legacy"]]),
                "remove_absent": describe([r for r in main if r.get("turnstile") != "absent"]),
                "remove_partial": describe([r for r in main if r.get("self_report") != "partial"])},
            "reliability_by_revision": {}}
        for rev in ("pre-June-30-deployment", "post-June-30-deployment"):
            subset = [r for r in main if r["revision"] == rev]
            report = {"n": len(subset), "dimensions": {}}
            for dim in DIMS:
                ids = [q["id"] for q in questions if q["dimension"] == dim and (mode == "strict" or q["priority"] == 1)]
                matrix = np.array([[r["answers_parsed"][str(q)]["v"] for q in ids] for r in subset])
                report["dimensions"][dim] = {"items": len(ids), **reliability(matrix)}
            modes[mode]["reliability_by_revision"][rev] = report
    audit = [{"id": r.get("id"), "revision": r["revision"], "flags": r["flags"], "notes": r["notes"], "straight_main": r.get("straight_main"), "straight_legacy": r.get("straight_legacy")} for r in prepared]
    (private_dir / "analysis-audit.private.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")
    summary = {"extracted_at": metadata["extractedAt"], "last_response_at": metadata["lastResponseAt"], "snapshot_sha256": metadata["sha256"],
        "snapshot_rows": len(rows), "known_test_removed_before_snapshot": 1, "seed": SEED, "bootstrap_replicates": REPLICATES,
        "language_status": "Historical language unrecorded; recruitment context was Chinese-language, not individually verified.",
        "revision_status": "Inferred deployment eras; not respondent-level proof of which cached frontend was used. Sessions spanning the revision boundary remain unknown.", "modes": modes}
    output.mkdir(parents=True, exist_ok=True)
    (output / "summary.json").write_text(json.dumps(summary, indent=2, allow_nan=False), encoding="utf-8")
    print(json.dumps({"received_after_known_test_removal": len(rows), "modes": {m: {"received": d["received"], "retained": d["main"]["n"], "revisions": d["revision_counts"]} for m, d in modes.items()}}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--private-dir", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    if args.private_dir.resolve().is_relative_to(repo) or args.snapshot.resolve().is_relative_to(repo):
        parser.error("Raw snapshot and private audit directory must be outside the public repository")
    run(args.snapshot, args.manifest, args.private_dir, args.out)
