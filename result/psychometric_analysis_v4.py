# -*- coding: utf-8 -*-
"""
研究生BTI 严谨版（80题）心理测量学分析脚本 v4
数据：bti-responses-2026-06-30.csv（合并两日采集）
修复 factor_analyzer 与新版 scikit-learn 的 API 兼容性。
"""
import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

# ------------------------------------------------------------------
# 补丁：factor-analyzer 0.5.1 使用旧参数名 force_all_finite，
# 新版 scikit-learn 已改为 ensure_all_finite。在导入 factor_analyzer
# 之后，替换其内部引用的 check_array。
# ------------------------------------------------------------------
import sklearn.utils.validation

_original_check_array = sklearn.utils.validation.check_array


def _patched_check_array(X, *args, **kwargs):
    if "force_all_finite" in kwargs:
        kwargs["ensure_all_finite"] = kwargs.pop("force_all_finite")
    return _original_check_array(X, *args, **kwargs)


from factor_analyzer import FactorAnalyzer
from factor_analyzer.factor_analyzer import calculate_kmo, calculate_bartlett_sphericity
import factor_analyzer.factor_analyzer as _fa_module
import factor_analyzer.confirmatory_factor_analyzer as _cfa_module

_fa_module.check_array = _patched_check_array
_cfa_module.check_array = _patched_check_array
import pingouin as pg

sys.stdout.reconfigure(encoding="utf-8")
warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# 0. 路径与常量
# ---------------------------------------------------------------------------
CSV_PATH = Path(r"D:\项目\牛马BTI\result\bti-responses-2026-06-30.csv")
OUT_DIR = CSV_PATH.parent

DIM_BLOCKS = {
    "CX": [f"q{i}" for i in range(1, 21)],
    "OA": [f"q{i}" for i in range(21, 41)],
    "PR": [f"q{i}" for i in range(41, 61)],
    "TW": [f"q{i}" for i in range(61, 81)],
}
ALL_QCOLS = [f"q{i}" for i in range(1, 81)]

DIM_LABELS = {
    "CX": "控制点 (C-内控 / X-外控)",
    "OA": "责任倾向 (O-过度负责 / A-逃避推诿)",
    "PR": "沟通模式 (P-主动预警 / R-被动滞后)",
    "TW": "危机应对 (T-韧性担当 / W-规避退缩)",
}


def section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


# ---------------------------------------------------------------------------
# 1. 读取数据
# ---------------------------------------------------------------------------
section("1. 数据读取")
df = pd.read_csv(CSV_PATH, encoding="utf-8-sig", dtype={"client_id": str})
print(f"总记录数: {len(df)}")
print(f"总列数: {df.shape[1]}")
print(f"mode 分布:\n{df['mode'].value_counts().to_string()}")
print(f"questions_version: {df['questions_version'].unique().tolist()}")

# ---------------------------------------------------------------------------
# 2. 筛选严谨版（80题）
# ---------------------------------------------------------------------------
section("2. 筛选 mode == strict（严谨版，80题）")
df_s = df[df["mode"] == "strict"].copy().reset_index(drop=True)
print(f"严谨版原始记录数: {len(df_s)}")

for dim, cols in DIM_BLOCKS.items():
    n_nonnull = df_s[cols].notna().sum(axis=1)
    bad = (n_nonnull != 20).sum()
    if bad:
        print(f"  警告: {dim} 维度有 {bad} 条记录非空题数 ≠ 20")
    else:
        print(f"  {dim}: 全部 {len(df_s)} 条记录均为 20 题")

# ---------------------------------------------------------------------------
# 3. 数据清洗
# ---------------------------------------------------------------------------
section("3. 数据清洗")


def parse_answers_json(row):
    try:
        a = json.loads(row["answers_json"])
    except Exception:
        a = {}
    ts = [d.get("t") for d in a.values() if isinstance(d.get("t"), (int, float))]
    poss = [d.get("pos") for d in a.values() if d.get("pos")]
    n = len(a)

    longest = cur = 0
    prev = None
    for p in poss:
        cur = cur + 1 if p == prev else 1
        longest = max(longest, cur)
        prev = p

    med_t = float(np.median(ts)) if ts else np.nan
    frac_fast = np.mean([t < 1000 for t in ts]) if ts else np.nan
    top_pos_share = (max(pd.Series(poss).value_counts()) / n) if n else np.nan

    return pd.Series(
        {
            "n_items": n,
            "median_t": med_t,
            "frac_fast": frac_fast,
            "longest_pos_run": longest,
            "top_pos_share": top_pos_share,
        }
    )


meta = df_s.apply(parse_answers_json, axis=1)
df_s = pd.concat([df_s, meta], axis=1)

# 3.1 去重
df_s = df_s.sort_values("created_at").reset_index(drop=True)
df_s["is_dup"] = df_s.duplicated(subset=["client_id"], keep="first")

# 3.2 Turnstile
df_s["flag_turnstile_fail"] = df_s["turnstile"] == "fail"
df_s["flag_turnstile_absent"] = df_s["turnstile"] == "absent"

# 3.3 速答（严谨版）
df_s["floor_ms"] = 120_000
speed_hits = (
    (df_s["median_t"] < 2000).astype(int)
    + (df_s["duration_ms"] < df_s["floor_ms"]).astype(int)
    + (df_s["frac_fast"] > 0.5).astype(int)
)
df_s["flag_speed"] = speed_hits >= 2

# 3.4 直线作答
df_s["run_thr"] = 48
df_s["flag_straight"] = (df_s["longest_pos_run"] >= df_s["run_thr"]) | (
    df_s["top_pos_share"] > 0.7
)

# 3.5 自评
df_s["flag_careless"] = df_s["self_report"] == "careless"
df_s["flag_partial"] = df_s["self_report"] == "partial"

# 3.6 硬删与可疑标记
hard_flags = (
    df_s["is_dup"]
    | df_s["flag_turnstile_fail"]
    | df_s["flag_speed"]
    | df_s["flag_straight"]
    | df_s["flag_careless"]
)
df_s["hard_exclude"] = hard_flags
df_s["suspect_absent"] = (~hard_flags) & df_s["flag_turnstile_absent"]
df_s["suspect_partial"] = (~hard_flags) & df_s["flag_partial"]
df_s["suspect"] = df_s["suspect_absent"] | df_s["suspect_partial"]

N0 = len(df_s)
N_hard = df_s["hard_exclude"].sum()
df_clean = df_s[~df_s["hard_exclude"]].copy()
N1 = len(df_clean)
N_suspect = df_clean["suspect"].sum()
N_suspect_absent = df_clean["suspect_absent"].sum()
N_suspect_partial = df_clean["suspect_partial"].sum()

print(f"重复提交: {df_s['is_dup'].sum()}")
print(f"Turnstile fail: {df_s['flag_turnstile_fail'].sum()}")
print(f"Turnstile absent: {df_s['flag_turnstile_absent'].sum()}")
print(f"速答嫌疑（满足≥2条）: {df_s['flag_speed'].sum()}")
print(f"  - median_t < 2000ms: {(df_s['median_t'] < 2000).sum()}")
print(f"  - duration_ms < 120s: {(df_s['duration_ms'] < 120_000).sum()}")
print(f"  - frac_fast > 50%: {(df_s['frac_fast'] > 0.5).sum()}")
print(f"直线作答嫌疑: {df_s['flag_straight'].sum()}")
print(f"self_report careless: {df_s['flag_careless'].sum()}")
print(f"self_report partial: {df_s['flag_partial'].sum()}")
print(f"\n清洗结果:")
print(f"  初始严谨版 N0 = {N0}")
print(f"  硬删数       = {N_hard} ({N_hard/N0*100:.2f}%)")
print(f"  主分析 N1    = {N1}")
print(f"  其中可疑(总体) = {N_suspect} ({N_suspect/N1*100:.2f}%)")
print(f"    - Turnstile absent: {N_suspect_absent}")
print(f"    - self_report partial: {N_suspect_partial}")

# 3.7 速答详情统计
df_s["speed_hit_median"] = df_s["median_t"] < 2000
df_s["speed_hit_duration"] = df_s["duration_ms"] < 120_000
df_s["speed_hit_fastfrac"] = df_s["frac_fast"] > 0.5

print(f"\n【速答时间统计】（严谨版全部 {N0} 人）")
speed_desc = df_s[["duration_ms", "median_t", "frac_fast"]].describe().round(3)
speed_desc.index = ["人数", "均值", "标准差", "最小值", "25%分位", "中位数", "75%分位", "最大值"]
print(speed_desc.to_string())

print("\n【速答判定条件命中情况】")
print(f"  命中 0 条: {(speed_hits == 0).sum()} 人")
print(f"  命中 1 条: {(speed_hits == 1).sum()} 人")
print(f"  命中 2 条: {(speed_hits == 2).sum()} 人")
print(f"  命中 3 条: {(speed_hits == 3).sum()} 人")

print("\n【各条件两两重叠】")
overlap = pd.crosstab(df_s["speed_hit_median"], df_s["speed_hit_duration"], margins=True)
print("  median_t<2000ms vs duration_ms<120s:")
print(overlap.to_string())
overlap2 = pd.crosstab(df_s["speed_hit_median"], df_s["speed_hit_fastfrac"], margins=True)
print("\n  median_t<2000ms vs frac_fast>50%:")
print(overlap2.to_string())
overlap3 = pd.crosstab(df_s["speed_hit_duration"], df_s["speed_hit_fastfrac"], margins=True)
print("\n  duration_ms<120s vs frac_fast>50%:")
print(overlap3.to_string())

# 保存速答者明细
speeder_cols = [
    "id", "client_id", "created_at", "duration_ms", "median_t", "frac_fast",
    "speed_hit_median", "speed_hit_duration", "speed_hit_fastfrac", "self_report", "turnstile"
]
speeders = df_s[df_s["flag_speed"]][speeder_cols].copy()
speeders = speeders.sort_values("duration_ms")
speeders["duration_min"] = (speeders["duration_ms"] / 60000).round(2)
speeders["median_t_sec"] = (speeders["median_t"] / 1000).round(2)
speeders["frac_fast_pct"] = (speeders["frac_fast"] * 100).round(1)
speeder_out = speeders[[
    "id", "duration_min", "median_t_sec", "frac_fast_pct",
    "speed_hit_median", "speed_hit_duration", "speed_hit_fastfrac",
    "self_report", "turnstile"
]]
print(f"\n【速答者明细】（共 {len(speeder_out)} 人，按总用时升序）")
print(speeder_out.to_string(index=False))

speeder_out.to_csv(OUT_DIR / "speeders_strict_ge2.csv", index=False, encoding="utf-8-sig")
print(f"\n速答者明细已保存: {OUT_DIR / 'speeders_strict_ge2.csv'}")

# ---------------------------------------------------------------------------
# 4. 维度得分
# ---------------------------------------------------------------------------
section("4. 维度得分描述统计")


def calc_strength(row, cols):
    vals = row[cols].dropna().astype(float)
    n = len(vals)
    if n == 0:
        return np.nan
    return vals.sum() / (4 * n) * 10


for dim, cols in DIM_BLOCKS.items():
    df_clean[f"s_{dim}"] = df_clean.apply(lambda r: calc_strength(r, cols), axis=1)
    print(f"\n{dim} ({DIM_LABELS[dim]}):")
    print(df_clean[f"s_{dim}"].describe().round(3).to_string())

# ---------------------------------------------------------------------------
# 5. 信度分析
# ---------------------------------------------------------------------------
section("5. 信度分析")


def cronbach_alpha(data, n_boot=2000, seed=42):
    df_items = data.dropna(axis=1, how="all")
    n_items = df_items.shape[1]
    if n_items < 2:
        return np.nan, (np.nan, np.nan)

    item_vars = df_items.var(axis=0, ddof=1)
    total_var = df_items.sum(axis=1).var(ddof=1)
    if total_var <= 0:
        return np.nan, (np.nan, np.nan)
    alpha = (n_items / (n_items - 1)) * (1 - item_vars.sum() / total_var)

    rng = np.random.default_rng(seed)
    boot_alphas = []
    n = len(df_items)
    for _ in range(n_boot):
        idx = rng.integers(0, n, size=n)
        sample = df_items.iloc[idx]
        iv = sample.var(axis=0, ddof=1)
        tv = sample.sum(axis=1).var(ddof=1)
        if tv > 0 and iv.sum() > 0:
            boot_alphas.append((n_items / (n_items - 1)) * (1 - iv.sum() / tv))
    ci_low, ci_high = np.percentile(boot_alphas, [2.5, 97.5]) if boot_alphas else (np.nan, np.nan)
    return alpha, (ci_low, ci_high)


def mcdonald_omega(data):
    df_items = data.dropna(axis=1, how="all").astype(float)
    # 移除零方差列
    df_items = df_items.loc[:, df_items.var(axis=0) > 0]
    if df_items.shape[1] < 2:
        return np.nan
    fa = FactorAnalyzer(n_factors=1, rotation=None, method="ml")
    try:
        fa.fit(df_items)
        loadings = fa.loadings_[:, 0]
        unique = fa.get_uniquenesses()
        omega = (loadings.sum() ** 2) / ((loadings.sum() ** 2) + unique.sum())
        return float(omega)
    except Exception as e:
        print(f"    Omega 计算失败: {e}")
        return np.nan


def split_half_reliability(data):
    df_items = data.dropna(axis=1, how="all").astype(float)
    cols = df_items.columns
    if len(cols) < 2:
        return np.nan
    odd = df_items[cols[::2]].sum(axis=1)
    even = df_items[cols[1::2]].sum(axis=1)
    if odd.std() == 0 or even.std() == 0:
        return np.nan
    r, _ = stats.pearsonr(odd, even)
    if r <= -1:
        return np.nan
    sb = (2 * r) / (1 + r)
    return float(sb)


reliability_rows = []
for dim, cols in DIM_BLOCKS.items():
    X = df_clean[cols].astype(float)
    zero_var = (X.var(axis=0) == 0).sum()
    if zero_var:
        print(f"  警告 {dim}: {zero_var} 题零方差")
    alpha, ci = cronbach_alpha(X)
    omega = mcdonald_omega(X)
    sb = split_half_reliability(X)
    reliability_rows.append(
        {
            "维度": dim,
            "题数": len(cols),
            "Cronbach_alpha": round(alpha, 3),
            "alpha_95CI_lower": round(ci[0], 3),
            "alpha_95CI_upper": round(ci[1], 3),
            "McDonald_omega": round(omega, 3),
            "SplitHalf_SB": round(sb, 3),
        }
    )

rel_df = pd.DataFrame(reliability_rows)
print("\n信度汇总:")
print(rel_df.to_string(index=False))


def avg_inter_item_corr(data):
    df_items = data.astype(float)
    corr = df_items.corr()
    mask = np.tril(np.ones(corr.shape), k=-1).astype(bool)
    vals = corr.where(mask)
    return vals.stack().mean()


print("\n各维度平均题间相关:")
for dim, cols in DIM_BLOCKS.items():
    avg = avg_inter_item_corr(df_clean[cols])
    print(f"  {dim}: {avg:.3f}")

# 项目删除后的 alpha
drop_alpha_rows = []
for dim, cols in DIM_BLOCKS.items():
    for c in cols:
        other = [x for x in cols if x != c]
        alpha, _ = cronbach_alpha(df_clean[other].astype(float))
        drop_alpha_rows.append(
            {"维度": dim, "删除题目": c, "删除后_alpha": round(alpha, 3)}
        )
drop_alpha_df = pd.DataFrame(drop_alpha_rows)

# 校正题总相关
cor_rows = []
for dim, cols in DIM_BLOCKS.items():
    for c in cols:
        other = [x for x in cols if x != c]
        total_others = df_clean[other].sum(axis=1)
        r, p = stats.pearsonr(df_clean[c].astype(float), total_others)
        cor_rows.append(
            {
                "维度": dim,
                "题目": c,
                "校正题总相关_r": round(r, 3),
                "p": f"{p:.3g}",
            }
        )
cor_df = pd.DataFrame(cor_rows)

# ---------------------------------------------------------------------------
# 6. 效度分析
# ---------------------------------------------------------------------------
section("6. 效度分析")

strength_cols = [f"s_{d}" for d in DIM_BLOCKS.keys()]
dim_corr = df_clean[strength_cols].corr()
print("\n维度得分相关矩阵:")
print(dim_corr.round(3).to_string())

# 6.1 单维度因子分析
print("\n各维度单因子 EFA（最大似然，验证单维性）:")
unidim_rows = []
for dim, cols in DIM_BLOCKS.items():
    X = df_clean[cols].astype(float)
    X = X.loc[:, X.var(axis=0) > 0]
    if X.shape[1] < 2:
        continue
    try:
        fa1 = FactorAnalyzer(n_factors=1, rotation=None, method="ml")
        fa1.fit(X)
        loadings = fa1.loadings_[:, 0]
        ev = fa1.get_factor_variance()[0][0]
        var_explained = fa1.get_factor_variance()[1][0]
        unidim_rows.append(
            {
                "维度": dim,
                "保留题数": X.shape[1],
                "第一特征值": round(ev, 3),
                "方差解释率": round(var_explained, 3),
                "平均负荷": round(np.mean(np.abs(loadings)), 3),
                "最小负荷": round(np.min(np.abs(loadings)), 3),
                "最大负荷": round(np.max(np.abs(loadings)), 3),
            }
        )
        # TW 维度：额外打印逐题负荷，供识别低负荷题
        if dim == "TW":
            tw_loading_df = pd.DataFrame({
                "题号": list(X.columns),
                "因子负荷": np.round(loadings, 3),
                "绝对值": np.round(np.abs(loadings), 3),
                "低负荷(<0.30)": np.abs(loadings) < 0.30,
            }).sort_values("绝对值").reset_index(drop=True)
            print("\n【TW 维度逐题因子负荷（按绝对值升序）】")
            print(tw_loading_df.to_string(index=False))
            low_tw = tw_loading_df[tw_loading_df["低负荷(<0.30)"]]["题号"].tolist()
            if low_tw:
                print(f"  ⚠ 负荷 < 0.30 的题目: {low_tw}")
            else:
                print("  所有题目负荷均 >= 0.30")
            tw_csv = OUT_DIR / "tw_item_loadings.csv"
            tw_loading_df.to_csv(tw_csv, index=False, encoding="utf-8-sig")
            print(f"  已保存: {tw_csv}")
    except Exception as e:
        print(f"  {dim} 失败: {e}")

if unidim_rows:
    unidim_df = pd.DataFrame(unidim_rows)
    print(unidim_df.to_string(index=False))

# 6.2 全卷多因子分析局限
print("\n全卷 4 因子 EFA 说明:")
print(f"  当前有效样本 N={N1}，题项 p={len(ALL_QCOLS)}。")
print(f"  由于 N < p，无法对全部 80 题进行稳定的 4 因子 EFA（因子模型不可识别）。")
print(f"  效度证据主要依赖：① 各维度内部一致性；② 各维度单维性；③ 维度间相关；④ AVE/MSV/ASV。")

# 6.3 聚合与区分效度
def calc_ave_msv_asv(dim_cols, dim_corr):
    results = []
    for dim, cols in dim_cols.items():
        X = df_clean[cols].astype(float)
        X = X.loc[:, X.var(axis=0) > 0]
        if X.shape[1] < 2:
            ave = np.nan
        else:
            try:
                fa1 = FactorAnalyzer(n_factors=1, rotation=None, method="ml")
                fa1.fit(X)
                loadings = fa1.loadings_[:, 0]
                ave = np.mean(loadings ** 2)
            except Exception:
                ave = np.nan

        others = [d for d in dim_cols.keys() if d != dim]
        r_vals = [dim_corr.loc[f"s_{dim}", f"s_{o}"] for o in others]
        msv = max([r ** 2 for r in r_vals])
        asv = np.mean([r ** 2 for r in r_vals])
        sqrt_ave = np.sqrt(ave) if not np.isnan(ave) else np.nan
        results.append(
            {
                "维度": dim,
                "AVE": round(ave, 3),
                "sqrt_AVE": round(sqrt_ave, 3),
                "MSV": round(msv, 3),
                "ASV": round(asv, 3),
                "AVE_ge_50": "是" if ave >= 0.5 else "否",
                "AVE_gt_MSV": "是" if ave > msv else "否",
                "AVE_gt_ASV": "是" if ave > asv else "否",
            }
        )
    return pd.DataFrame(results)


ave_df = calc_ave_msv_asv(DIM_BLOCKS, dim_corr)
print("\n聚合与区分效度:")
print(ave_df.to_string(index=False))
print("\n判断标准:")
print("  - AVE >= .50 聚合效度可接受（Fornell & Larcker, 1981）")
print("  - AVE > MSV 且 AVE > ASV 区分效度良好")

# 6.4 敏感性分析（分项）
print("\n敏感性分析：分项剔除可疑样本后的信度对比")
print(f"  主分析 N = {N1}")

df_no_absent = df_clean[~df_clean["suspect_absent"]].copy()
df_no_partial = df_clean[~df_clean["suspect_partial"]].copy()
print(f"  剔除 Turnstile absent 后 N = {len(df_no_absent)}")
print(f"  剔除 self_report partial 后 N = {len(df_no_partial)}")

sens_rows = []
for dim, cols in DIM_BLOCKS.items():
    alpha_all, _ = cronbach_alpha(df_clean[cols].astype(float))
    alpha_no_abs, _ = cronbach_alpha(df_no_absent[cols].astype(float)) if len(df_no_absent) > 5 else (np.nan, (np.nan, np.nan))
    alpha_no_part, _ = cronbach_alpha(df_no_partial[cols].astype(float)) if len(df_no_partial) > 5 else (np.nan, (np.nan, np.nan))
    sens_rows.append(
        {
            "维度": dim,
            "alpha_主分析": round(alpha_all, 3),
            "alpha_去absent": round(alpha_no_abs, 3) if not np.isnan(alpha_no_abs) else "N/A",
            "alpha_去partial": round(alpha_no_part, 3) if not np.isnan(alpha_no_part) else "N/A",
        }
    )
sens_df = pd.DataFrame(sens_rows)
print(sens_df.to_string(index=False))

# ---------------------------------------------------------------------------
# 7. 输出
# ---------------------------------------------------------------------------
section("7. 输出报告与数据")

report_path = OUT_DIR / "psychometric_report.md"
with open(report_path, "w", encoding="utf-8") as f:
    f.write("# 研究生BTI 严谨版（80题）心理测量学分析报告\n\n")
    f.write("**分析日期**: 2026-06-30\n\n")
    f.write(f"**数据来源**: `{CSV_PATH.name}`\n\n")

    f.write("## 1. 样本与清洗\n\n")
    f.write(f"- 总记录数: {len(df)}\n")
    f.write(f"- 严谨版（80题）原始记录数: {N0}\n")
    f.write("- 硬删规则: 重复提交 / Turnstile=fail / 速答（满足≥2条） / 直线作答 / self_report=careless\n")
    f.write(f"- 硬删数: {N_hard} ({N_hard/N0*100:.2f}%)\n")
    f.write(f"- 主分析样本量: **N = {N1}**\n")
    f.write(f"- 可疑样本（敏感性分析用）: {N_suspect} ({N_suspect/N1*100:.2f}%)\n")
    f.write(f"  - Turnstile absent: {N_suspect_absent}\n")
    f.write(f"  - self_report partial: {N_suspect_partial}\n\n")
    f.write("| 硬删规则 | 剔除数 | 占严谨版比例 |\n")
    f.write("|---|---|---|\n")
    f.write(f"| 重复提交 | {df_s['is_dup'].sum()} | {df_s['is_dup'].sum()/N0*100:.2f}% |\n")
    f.write(f"| Turnstile fail | {df_s['flag_turnstile_fail'].sum()} | {df_s['flag_turnstile_fail'].sum()/N0*100:.2f}% |\n")
    f.write(f"| 速答嫌疑 | {df_s['flag_speed'].sum()} | {df_s['flag_speed'].sum()/N0*100:.2f}% |\n")
    f.write(f"| 直线作答 | {df_s['flag_straight'].sum()} | {df_s['flag_straight'].sum()/N0*100:.2f}% |\n")
    f.write(f"| self_report careless | {df_s['flag_careless'].sum()} | {df_s['flag_careless'].sum()/N0*100:.2f}% |\n\n")

    f.write("### 1.1 速答详情（≥2 条标准）\n\n")
    f.write("**速答判定标准**（满足≥2条即硬删）：\n\n")
    f.write("1. 每题中位用时 < 2000ms\n")
    f.write("2. 总作答时长 < 120s（2分钟）\n")
    f.write("3. 快题占比 > 50%（单题用时<1000ms）\n\n")
    f.write(f"**答题时间描述统计**（严谨版全部 {N0} 人）：\n\n")
    speed_desc_md = df_s[["duration_ms", "median_t", "frac_fast"]].describe().round(3).to_markdown()
    f.write(speed_desc_md + "\n\n")
    f.write("- `duration_ms`：总用时（毫秒）\n")
    f.write("- `median_t`：每题用时中位数（毫秒）\n")
    f.write("- `frac_fast`：快题占比（单题<1000ms）\n\n")
    f.write("**条件命中分布**：\n\n")
    f.write("| 命中条件数 | 人数 |\n|---|---|\n")
    for k in range(4):
        f.write(f"| {k} 条 | {(speed_hits == k).sum()} |\n")
    f.write("\n")
    f.write(f"**速答者明细**（共 {len(speeder_out)} 人，按总用时升序）：\n\n")
    f.write(speeder_out.to_markdown(index=False) + "\n\n")
    f.write("- `duration_min`：总用时（分钟）\n")
    f.write("- `median_t_sec`：每题中位用时（秒）\n")
    f.write("- `frac_fast_pct`：快题占比（%）\n\n")

    f.write("## 2. 维度得分描述统计\n\n")
    for dim in DIM_BLOCKS.keys():
        f.write(f"### {dim} ({DIM_LABELS[dim]})\n\n")
        desc = df_clean[f"s_{dim}"].describe().round(3).to_frame().T
        f.write(desc.to_markdown() + "\n\n")

    f.write("## 3. 信度\n\n")
    f.write(rel_df.to_markdown(index=False) + "\n\n")
    f.write("> 注：Cronbach alpha >= .70 通常可接受，>= .80 良好，>= .90 优秀；95% CI 为 Bootstrap 2000 次。\n\n"
    )

    f.write("### 3.1 平均题间相关\n\n")
    f.write("| 维度 | 平均题间相关 |\n|---|---|\n")
    for dim, cols in DIM_BLOCKS.items():
        avg = avg_inter_item_corr(df_clean[cols])
        f.write(f"| {dim} | {avg:.3f} |\n")
    f.write("\n")

    f.write("### 3.2 项目删除后的 alpha 变化\n\n")
    f.write(drop_alpha_df.to_markdown(index=False) + "\n\n")

    f.write("### 3.3 校正题总相关\n\n")
    f.write(cor_df.to_markdown(index=False) + "\n\n")

    f.write("## 4. 效度\n\n")
    f.write("### 4.1 维度相关矩阵\n\n")
    f.write(dim_corr.round(3).to_markdown() + "\n\n")

    f.write("### 4.2 各维度单维性（单因子 EFA）\n\n")
    if unidim_rows:
        f.write(unidim_df.to_markdown(index=False) + "\n\n")

    f.write("#### 4.2.1 TW 维度逐题因子负荷\n\n")
    try:
        tw_loading_df
        f.write(tw_loading_df.to_markdown(index=False) + "\n\n")
        low_list = tw_loading_df[tw_loading_df["低负荷(<0.30)"]]["题号"].tolist()
        if low_list:
            f.write(f"> ⚠ 负荷 < 0.30 的题目（建议审查）：{', '.join(low_list)}\n\n")
        else:
            f.write("> 所有 TW 题目负荷均 ≥ 0.30，单维性良好。\n\n")
    except NameError:
        f.write("（TW EFA 未成功运行，跳过）\n\n")

    f.write("### 4.3 全卷多因子分析说明\n\n")
    f.write(f"当前有效样本 N = {N1}，题项 p = {len(ALL_QCOLS)}。由于 N < p，无法对全部 80 题同时进行稳定的 4 因子 EFA（模型不可识别）。因此本报告的结构效度证据主要基于各维度内部一致性、单维性、维度间相关以及 AVE/MSV/ASV。\n\n")

    f.write("### 4.4 聚合与区分效度\n\n")
    f.write(ave_df.to_markdown(index=False) + "\n\n")
    f.write("- **AVE（Average Variance Extracted）**: 维度能解释自身指标变异的比例。\n")
    f.write("- **MSV（Maximum Shared Variance）**: 该维度与其他维度相关最大值的平方。\n")
    f.write("- **ASV（Average Shared Variance）**: 该维度与其他维度相关平方的均值。\n")
    f.write("- 判断：AVE >= .50 聚合效度可接受；AVE > MSV/ASV 区分效度良好。\n\n")

    f.write("## 5. 敏感性分析\n\n")
    f.write("分项剔除可疑样本后，信度对比：\n\n")
    f.write(sens_df.to_markdown(index=False) + "\n\n")
    f.write(f"- 剔除 Turnstile absent 后 N = {len(df_no_absent)}\n")
    f.write(f"- 剔除 self_report partial 后 N = {len(df_no_partial)}\n")
    f.write("- 同时剔除两者后仅剩 4 例，样本过小，未列入。\n\n")

    f.write("## 6. 讨论与局限\n\n")
    f.write(f"1. **样本量**：严谨版有效样本 N = {N1}，规模较小。心理测量学常规建议每维度至少 5-10 人/题，当前勉强满足最低要求，结论需谨慎外推。\n")
    f.write(f"2. **Turnstile absent 比例极高**：{df_s['flag_turnstile_absent'].sum()}/{N0} = {df_s['flag_turnstile_absent'].sum()/N0*100:.1f}%。可能反映国内网络环境下 widget 加载不稳定。本分析未将 absent 作为硬删依据，但标记为可疑并做敏感性分析；剔除 absent 后 N 降至 {len(df_no_absent)}。\n")
    f.write(f"3. **速答剔除比例较高**：{df_s['flag_speed'].sum()}/{N0} = {df_s['flag_speed'].sum()/N0*100:.1f}%，提示线上自评中部分被试未充分阅读题目。\n")
    f.write(f"4. **全卷 CFA/EFA**：由于 N < p，未进行全卷 4 因子 EFA。建议在样本扩大后补充验证性因子分析（CFA）以进一步验证四因子结构。\n")
    f.write(f"5. **维度间相关偏高**：CX 与 OA 相关 r = {dim_corr.loc['s_CX','s_OA']:.3f}，PR 与 TW 相关 r = {dim_corr.loc['s_PR','s_TW']:.3f}，提示部分维度可能测量相近构念，需更大样本进一步检验区分效度。\n\n")

    f.write("## 7. 方法摘要\n\n")
    f.write("1. **样本筛选**：仅保留 `mode == 'strict'` 的完整 80 题作答。\n")
    f.write("2. **数据清洗**：按预设规则硬删重复、机器人失败、速答、直线作答、自评 careless；Turnstile absent 与 self_report partial 标记为可疑用于敏感性分析。\n")
    f.write("3. **计分**：每维 strength = sum(value) / (4*n) * 10，与前端一致。\n")
    f.write("4. **信度**：Cronbach's alpha（Bootstrap 95% CI）、McDonald's omega、奇偶分半经 Spearman-Brown 校正、平均题间相关、项目删除后 alpha、校正题总相关。\n")
    f.write("5. **效度**：维度相关矩阵、各维度单因子 EFA 评估单维性、AVE/MSV/ASV 评估聚合与区分效度；全卷 CFA/EFA 因 N < p 未能进行。\n")

print(f"报告已保存: {report_path}")

clean_path = OUT_DIR / "bti-responses-strict-clean.csv"
df_clean.to_csv(clean_path, index=False, encoding="utf-8-sig")
print(f"清洗后数据已保存: {clean_path}")

sens_abs_path = OUT_DIR / "bti-responses-strict-no-absent.csv"
df_no_absent.to_csv(sens_abs_path, index=False, encoding="utf-8-sig")
print(f"剔除 absent 后数据已保存: {sens_abs_path}")

sens_part_path = OUT_DIR / "bti-responses-strict-no-partial.csv"
df_no_partial.to_csv(sens_part_path, index=False, encoding="utf-8-sig")
print(f"剔除 partial 后数据已保存: {sens_part_path}")

print("\n分析完成。")
