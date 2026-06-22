"""학습 모델 평가 + 내보내기 (task #4).

- 검증셋(학습과 동일 seed/val-frac 로 재현)에서:
    * 3축 MAE(warmcool/value/clarity)
    * 파생 시즌/타입 정확도(규칙 라벨 재현율)
    * 시즌 혼동행렬(4x4) — CNN 이 어느 시즌을 헷갈리는지
- ONNX 내보내기(서버/Jetson 배포용): image(N,3,H,W) -> axes(N,3).

사용:
  ./venv/bin/python export.py --model models/personal_color_resnet18.pt --onnx
"""

import argparse
import json
import os
import random
import sys

import numpy as np
import torch
from torch.utils.data import DataLoader

from taxonomy import TYPES, derive_type
from train import AxisDataset, AXES, build_model, build_transforms, read_records

SEASONS = ["spring", "summer", "autumn", "winter"]


@torch.no_grad()
def collect(model, loader, device):
    """검증셋 전체의 (예측축, 라벨축) 모음 -> (P, T) ndarray (N,3)."""
    model.eval()
    preds, labels = [], []
    for x, y in loader:
        x = x.to(device, non_blocking=True)
        preds.append(model(x).float().cpu().numpy())
        labels.append(y.numpy())
    return np.concatenate(preds), np.concatenate(labels)


def season_confusion(pred_axes, label_axes):
    """행=실제(규칙) 시즌, 열=예측 시즌 카운트."""
    idx = {s: i for i, s in enumerate(SEASONS)}
    mat = np.zeros((4, 4), dtype=int)
    for p, t in zip(pred_axes, label_axes):
        ps = TYPES[derive_type(*p)]["season"]
        ts = TYPES[derive_type(*t)]["season"]
        mat[idx[ts], idx[ps]] += 1
    return mat


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", default="models/personal_color_resnet18.pt")
    ap.add_argument("--data", default="data/fairface")
    ap.add_argument("--val-frac", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--onnx", action="store_true", help="ONNX 도 내보내기")
    args = ap.parse_args()

    if not os.path.exists(args.model):
        print(f"모델 없음: {args.model}  (먼저 train.py 로 학습)")
        raise SystemExit(1)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    ckpt = torch.load(args.model, map_location=device, weights_only=False)
    model = build_model(ckpt["arch"])
    model.load_state_dict(ckpt["state_dict"])
    model.to(device).eval()
    size = ckpt["img_size"]
    print(f"모델: {args.model}  arch={ckpt['arch']}  epoch={ckpt.get('epoch')}  "
          f"학습시 val_season_acc={ckpt.get('val_season_acc'):.3f}")

    # 학습과 동일하게 val 분할 재현
    records = read_records(os.path.join(args.data, "labels.csv"), limit=args.limit)
    random.Random(args.seed).shuffle(records)
    n_val = max(1, int(len(records) * args.val_frac))
    val_recs = records[:n_val]
    _, val_tf = build_transforms(size)
    val_ld = DataLoader(AxisDataset(val_recs, os.path.join(args.data, "img"), val_tf),
                        batch_size=args.batch, shuffle=False,
                        num_workers=args.workers, pin_memory=(device == "cuda"))

    P, T = collect(model, val_ld, device)
    mae = np.abs(P - T).mean(axis=0)
    season_ok = np.mean([TYPES[derive_type(*p)]["season"] == TYPES[derive_type(*t)]["season"]
                         for p, t in zip(P, T)])
    type_ok = np.mean([derive_type(*p) == derive_type(*t) for p, t in zip(P, T)])

    print(f"\n검증셋 N={len(val_recs)}")
    print("축 MAE: " + "  ".join(f"{a}={m:.3f}" for a, m in zip(AXES, mae)))
    print(f"파생 시즌 정확도: {season_ok:.3f}   타입 정확도: {type_ok:.3f}")

    mat = season_confusion(P, T)
    print("\n시즌 혼동행렬 (행=규칙라벨, 열=CNN예측):")
    print("        " + "".join(f"{s:>9}" for s in SEASONS))
    for i, s in enumerate(SEASONS):
        print(f"  {s:>6}" + "".join(f"{mat[i, j]:9d}" for j in range(4)))

    # 서버(torch 없는 onnxruntime)가 전처리/축순서를 알 수 있도록 사이드카 JSON
    meta = {
        "arch": ckpt["arch"],
        "img_size": size,
        "axes": ckpt.get("axes", AXES),
        "normalize": ckpt["normalize"],
        "val": {
            "season_acc": float(season_ok),
            "type_acc": float(type_ok),
            "mae": {a: float(m) for a, m in zip(AXES, mae)},
        },
    }
    meta_path = os.path.splitext(args.model)[0] + ".json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"\n사이드카 저장: {meta_path}")

    if args.onnx:
        onnx_path = os.path.splitext(args.model)[0] + ".onnx"
        dummy = torch.randn(1, 3, size, size, device=device)
        torch.onnx.export(
            model, dummy, onnx_path,
            input_names=["image"], output_names=["axes"],
            dynamic_axes={"image": {0: "batch"}, "axes": {0: "batch"}},
            opset_version=17)
        sz = os.path.getsize(onnx_path) / 1e6
        print(f"\nONNX 저장: {onnx_path}  ({sz:.1f} MB)")

    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)  # 네이티브 스레드 finalize 충돌(SIGABRT) 회피


if __name__ == "__main__":
    main()
