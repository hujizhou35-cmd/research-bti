"""Render public aggregate summaries only; never reads individual responses."""
import argparse
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

LABELS = {'CX': 'Locus of control', 'OA': 'Responsibility', 'PR': 'Communication', 'TW': 'Crisis response'}
CODES = ['COPT','COPW','CORT','CORW','CAPT','CAPW','CART','CARW','XOPT','XOPW','XORT','XORW','XAPT','XAPW','XART','XARW']

def fmt(x, digits=3):
    return 'NA' if x is None else f'{x:.{digits}f}'

def render(folder):
    summary = json.loads((folder / 'summary.json').read_text())
    with plt.rc_context({'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False, 'svg.fonttype': 'path'}):
        fig, axes = plt.subplots(1, 2, figsize=(12, 5.4), layout='constrained', facecolor='white')
        ax = axes[0]
        for offset, mode, label, color in [(-.19,'fun','Quick mode','#647681'),(.19,'strict','Full mode','#B5322B')]:
            data = summary['modes'][mode]['main']
            values = [data['types'].get(code, 0) for code in CODES]
            bars = ax.bar([i+offset for i in range(16)], values, width=.36, color=color, label=f'{label} (n={data["n"]})')
            ax.bar_label(bars, labels=[str(v) if v else '' for v in values], fontsize=8, padding=2)
        ax.set_xticks(range(16), CODES, rotation=90)
        ax.set(ylabel='Retained completed responses', title='A. Archetype counts', ylim=(0, 23))
        ax.legend(frameon=False, fontsize=9)
        ax.yaxis.get_major_locator().set_params(integer=True)
        ax = axes[1]
        for offset, mode, label, color, marker in [(-.09,'fun','Quick mode','#647681','s'),(.09,'strict','Full mode','#B5322B','o')]:
            data = summary['modes'][mode]['main']
            means = [v['mean'] for v in data['dimensions'].values()]
            sds = [v['sd'] for v in data['dimensions'].values()]
            ax.errorbar([i+offset for i in range(4)], means, yerr=sds, fmt=marker, color=color, capsize=4, markersize=6, label=label)
        ax.set_xticks(range(4), ['CX','OA','PR','TW'])
        ax.set(ylabel='First-pole strength (0–10)', title='B. Dimension scores: mean ± SD', ylim=(0,10), xlim=(-.5,3.5))
        ax.set_yticks(range(0,11,2))
        ax.axhline(5, color='#999999', linewidth=.8, linestyle='--')
        ax.legend(frameon=False, fontsize=9, loc='lower left')
        fig.suptitle('Research BTI · Initial convenience-sample findings', fontsize=14, fontweight='bold')
        fig.supxlabel('Historical deployment eras pooled for description only. No population estimates or screening validation.', fontsize=9)
        fig.savefig(folder / 'pilot-summary.png', dpi=180, facecolor='white')
        plt.close(fig)
    lines = ['# Initial pilot findings', '', 'These are exploratory summaries of completed responses, not estimates for a university or for students generally. They do not validate personnel selection or predict team performance.', '',
        f'- Snapshot extracted: **{summary["extracted_at"]}**.', f'- Latest included server timestamp: **{summary["last_response_at"]}**.',
        '- Before snapshot: 84 records; one owner-identified automated test was precisely removed, leaving **83**. All other production records remain stored, including analysis exclusions.',
        '- According to the project initiator, early recruitment mainly targeted undergraduates at China Medical University. School and education level were not collected or verified per response; this is not university endorsement.',
        '- Historical answer language was not recorded. Recruitment context and the old Chinese-only interface do not provide respondent-level language verification.',
        '- Counts refer to responses, not verified unique people. Browser identifiers cannot establish identity or guarantee human authorship.', '',
        '![Type counts and dimension mean ± standard deviation in each mode](pilot-summary.png)', '',
        'The plot uses raw counts from zero and a common 0–10 score scale. Error bars show **SD**, not confidence intervals. The underlying aggregate values are in [summary.json](summary.json).', '', '## Analysis flow', '',
        '| Mode | Snapshot records | Retained | Excluded from analysis |', '|---|---:|---:|---:|']
    for mode, label in [('fun','Quick, 40 questions'),('strict','Full, 80 questions')]:
        d = summary['modes'][mode]
        lines.append(f'| {label} | {d["received"]} | {d["main"]["n"]} | {d["received"]-d["main"]["n"]} |')
    lines += ['', 'Exclusion reasons overlap; they must not be added as if mutually exclusive.', '']
    for mode, label in [('fun','Quick'),('strict','Full')]:
        d = summary['modes'][mode]
        reasons = ', '.join(f'{k}: {v}' for k,v in d['exclusion_flags_overlapping'].items()) or 'none'
        lines += [f'- **{label}:** {reasons}; additional main straight-position exclusions: {d["straight_main_flagged"]}.']
    lines += ['', '## Score distributions', '', 'First-pole strength = sum of option values / (4 × dimension question count) × 10. The first poles are internal attribution (C), over-responsibility (O), proactive communication (P), and stepping up in crises (T). Higher is not a universal judgment of better character or ability.', '',
        '| Mode | Dimension | n | Mean | SD | Median | Q1 | Q3 |', '|---|---|---:|---:|---:|---:|---:|---:|']
    for mode in ('fun','strict'):
        d = summary['modes'][mode]['main']
        for key,v in d['dimensions'].items(): lines.append(f'| {mode} | {key} — {LABELS[key]} | {d["n"]} | '+ ' | '.join(fmt(v[k]) for k in ('mean','sd','median','q1','q3')) + ' |')
    lines += ['', '## All sixteen types', '', '| Type | Quick count | Full count |','|---|---:|---:|']
    for code in CODES: lines.append(f'| {code} | {summary["modes"]["fun"]["main"]["types"].get(code,0)} | {summary["modes"]["strict"]["main"]["types"].get(code,0)} |')
    lines += ['', '## Preliminary internal consistency', '',
        '**These estimates mainly describe the older Chinese question wording. They do not validate the current revised wording, English or Japanese translations, construct validity, or team-selection performance.** Alpha measures internal consistency; high alpha alone does not establish validity.', '',
        'Questions 66, 71 and 77 changed without changing the historical `2.1` version label. Deployment-era classification uses server completion and consent timestamps. These are inferred eras, not proof of the exact cached frontend each respondent used. Cross-boundary sessions remain unknown and are not pooled for full-scale reliability.', '',
        'The revised deployment completed on 2026-06-30 at 05:26:58.693906 UTC (13:26:58 China time). The retained full-mode pre-revision group has 44 responses; the post-revision group has only one, so its alpha is not estimable.', '',
        '| Mode | Deployment era | n | Dimension | Items | Alpha | Bootstrap 95% CI |', '|---|---|---:|---|---:|---:|---|']
    for mode in ('fun','strict'):
        for era,group in summary['modes'][mode]['reliability_by_revision'].items():
            for dim,v in group['dimensions'].items():
                ci = v['ci95']
                lines.append(f'| {mode} | {era} | {group["n"]} | {dim} | {v["items"]} | {fmt(v["alpha"])} | '+ (' to '.join(fmt(x) for x in ci) if ci else 'NA — see limitations') + ' |')
    lines += ['', 'Bootstrap: 2,000 response-level resamples, percentile interval, seed 20261015. If any resample has undefined alpha because of zero total-score variance, the interval is not reported rather than silently conditioning on successful resamples. Small samples make these estimates unstable. The quick-mode OA estimate is **negative**, which is a concern, not evidence of adequate reliability.', '',
        '## Sensitivity analyses', '', '| Scenario | Quick retained | Full retained |', '|---|---:|---:|']
    for key,label in [('legacy_straight_thresholds','Legacy stricter straight-position rule'),('remove_absent','Additionally exclude CAPTCHA absent'),('remove_partial','Additionally exclude self-report partial')]:
        lines.append(f'| {label} | {summary["modes"]["fun"]["sensitivity"][key]["n"]} | {summary["modes"]["strict"]["sensitivity"][key]["n"]} |')
    lines += ['', 'All scenario score summaries and type counts, including empty groups, are retained in `summary.json`. Excluding CAPTCHA-absent responses leaves no quick-mode sample and only six full-mode responses. This is a substantial quality-verification limitation; missing CAPTCHA evidence is not proof of automation.', '',
        '## Reproducible methods and limitations', '',
        '- Validate expected question IDs, values, option-position consistency, recorded pole, consent and recomputed scores/type. Unsupported or inconsistent records are excluded from analysis.',
        '- Keep the earliest complete structurally valid response per browser, mode and inferred revision; then apply quality exclusions. Missing browser IDs are not merged.',
        '- Exclude CAPTCHA fail, self-reported careless responses, and at least two speed flags: median item time <2 s, total time <1.5 s × question count, or >50% of items <1 s. Missing timing is not treated as zero.',
        '- Main straight-position exclusion: >80% at one screen position or a continuous run ≥80% of questions. Sensitivity rule: >70% or a run ≥60%. These rules never delete raw production responses.',
        '- Keep absent, disabled and unrecorded CAPTCHA states distinct. Analyze partial self-reports and absent verification in separate sensitivity scenarios.',
        '- No factor-structure, predictive, cross-cultural, representative-population or selection-validity claims are made. Current revised-wording and translated-version validation remain outstanding.', '',
        'Reproduction: [analysis script](../../scripts/analyze_responses.py), [figure/report script](../../scripts/render_analysis.py), [Python dependencies](../../scripts/requirements-analysis.txt). The scripts require an owner-supplied private snapshot and its manifest; individual responses and identifiers are not distributed.', '',
        f'Source snapshot SHA-256: `{summary["snapshot_sha256"]}`.', '', 'Figure workflow reference: Kassis, T., Agarwal, V., He, Y., Patel, D., & Brueckner, A. M. (2026). Scientific Agent Skills: A Library of Procedural Knowledge for Research Agents. https://doi.org/10.48550/arXiv.2609.00065 (metadata verified on 2026-10-15).', '']
    (folder/'README.md').write_text('\n'.join(lines), encoding='utf-8')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--summary-dir', type=Path, default=Path('docs/analysis'))
    render(parser.parse_args().summary_dir)
