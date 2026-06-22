"""퍼스널컬러 멀티태스크 CNN 학습.

입력: label_dataset.py 가 만든 (224px 얼굴 크롭, 3축 의사라벨) 코퍼스.
출력: 이미지 -> 3축(warmcool/value/clarity) 연속값을 회귀하는 CNN(.pt).

12타입/시즌은 축에서 taxonomy.derive_type 로 파생하므로 모델은 축 3개만 예측한다.
핵심 검증 지표는 '규칙이 매긴 시즌/타입을 CNN 이 얼마나 재현하는가'(파생 시즌/
타입 정확도) — 의사라벨이 곧 ground truth 라 이게 본질 지표다. 축 MAE 도 함께 본다.

색이 곧 신호라서 ColorJitter 류 색 증강은 라벨을 망가뜨린다 → 기하 증강만 쓴다.
라벨이 원본(화이트밸런스 미적용) 색에서 나왔으므로 학습/추론 모두 원본 색을 쓴다.

사용:
  ./venv/bin/python train.py --epochs 20 --batch 32 --arch resnet18
  ./venv/bin/python train.py --epochs 2 --limit 200   # 파이프라인 스모크
"""

import argparse
import csv
import json
import os
import random
import sys

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset

from taxonomy import TYPES, derive_type

AXES = ["warmcool", "value", "clarity"]
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


# ===== 데이터 ================================================================

def read_records(csv_path, limit=None):
    """labels.csv -> [{filename, warmcool, value, clarity}, ...]."""
    out = []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            out.append({
                "filename": row["filename"],
                "warmcool": float(row["warmcool"]),
                "value": float(row["value"]),
                "clarity": float(row["clarity"]),
            })
    if limit:
        out = out[:limit]
    return out


class AxisDataset(Dataset):
    def __init__(self, records, img_dir, transform):
        self.records = records
        self.img_dir = img_dir
        self.transform = transform

    def __len__(self):
        return len(self.records)

    def __getitem__(self, i):
        r = self.records[i]
        img = Image.open(os.path.join(self.img_dir, r["filename"])).convert("RGB")
        x = self.transform(img)
        y = torch.tensor([r[a] for a in AXES], dtype=torch.float32)
        return x, y


def build_transforms(size):
    from torchvision import transforms as T
    norm = T.Normalize(IMAGENET_MEAN, IMAGENET_STD)
    # 색 증강 없음(라벨 오염 방지). 기하 증강만.
    train_tf = T.Compose([
        T.RandomResizedCrop(size, scale=(0.85, 1.0), ratio=(0.9, 1.1)),
        T.RandomHorizontalFlip(),
        T.RandomRotation(8),
        T.ToTensor(),
        norm,
    ])
    # 크롭은 이미 size 정사각 → val 은 그대로 텐서화.
    val_tf = T.Compose([T.Resize((size, size)), T.ToTensor(), norm])
    return train_tf, val_tf


# ===== 모델 ==================================================================

def build_model(arch):
    from torchvision import models as M
    if arch == "resnet18":
        m = M.resnet18(weights=M.ResNet18_Weights.DEFAULT)
        m.fc = nn.Linear(m.fc.in_features, 3)
    elif arch == "efficientnet_b0":
        m = M.efficientnet_b0(weights=M.EfficientNet_B0_Weights.DEFAULT)
        m.classifier[1] = nn.Linear(m.classifier[1].in_features, 3)
    else:
        raise ValueError(f"unknown arch: {arch}")
    return m


# ===== 평가 ==================================================================

@torch.no_grad()
def evaluate(model, loader, device, use_amp):
    """축 MAE + 파생 시즌/타입 정확도(규칙 라벨 재현율)."""
    model.eval()
    abs_err = torch.zeros(3)
    n = season_ok = type_ok = 0
    for x, y in loader:
        x = x.to(device, non_blocking=True)
        with torch.amp.autocast("cuda", enabled=use_amp):
            pred = model(x)
        pred = pred.float().cpu()
        abs_err += (pred - y).abs().sum(0)
        n += len(y)
        for p, t in zip(pred.tolist(), y.tolist()):
            pt, tt = derive_type(*p), derive_type(*t)
            type_ok += int(pt == tt)
            season_ok += int(TYPES[pt]["season"] == TYPES[tt]["season"])
    mae = (abs_err / max(n, 1)).tolist()
    return mae, season_ok / max(n, 1), type_ok / max(n, 1)


# ===== 학습 ==================================================================

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default="data/fairface", help="labels.csv + img/ 위치")
    ap.add_argument("--arch", default="resnet18",
                    choices=["resnet18", "efficientnet_b0"])
    ap.add_argument("--epochs", type=int, default=20)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--weight-decay", type=float, default=1e-4)
    ap.add_argument("--val-frac", type=float, default=0.2)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--size", type=int, default=224)
    ap.add_argument("--limit", type=int, default=None, help="레코드 수 제한(스모크용)")
    ap.add_argument("--out", default="models")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--no-amp", action="store_true")
    args = ap.parse_args()

    set_seed(args.seed)
    torch.backends.cudnn.benchmark = True
    device = "cuda" if torch.cuda.is_available() else "cpu"
    use_amp = (device == "cuda") and not args.no_amp
    os.makedirs(args.out, exist_ok=True)

    csv_path = os.path.join(args.data, "labels.csv")
    img_dir = os.path.join(args.data, "img")
    if not os.path.exists(csv_path):
        print(f"라벨 CSV 없음: {csv_path}  (먼저 label_dataset.py 실행)")
        raise SystemExit(1)

    records = read_records(csv_path, limit=args.limit)
    rng = random.Random(args.seed)
    rng.shuffle(records)
    n_val = max(1, int(len(records) * args.val_frac))
    val_recs, train_recs = records[:n_val], records[n_val:]
    print(f"데이터: 총 {len(records)}  train {len(train_recs)}  val {len(val_recs)}")
    print(f"device={device}  arch={args.arch}  amp={use_amp}  batch={args.batch}")

    train_tf, val_tf = build_transforms(args.size)
    train_ld = DataLoader(AxisDataset(train_recs, img_dir, train_tf),
                          batch_size=args.batch, shuffle=True,
                          num_workers=args.workers, pin_memory=(device == "cuda"),
                          drop_last=True)
    val_ld = DataLoader(AxisDataset(val_recs, img_dir, val_tf),
                        batch_size=args.batch, shuffle=False,
                        num_workers=args.workers, pin_memory=(device == "cuda"))

    model = build_model(args.arch).to(device)
    criterion = nn.SmoothL1Loss()
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr,
                            weight_decay=args.weight_decay)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=args.epochs)
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)

    best_acc = -1.0
    best_path = os.path.join(args.out, f"personal_color_{args.arch}.pt")
    for epoch in range(1, args.epochs + 1):
        model.train()
        run_loss = seen = 0
        for x, y in train_ld:
            x = x.to(device, non_blocking=True)
            y = y.to(device, non_blocking=True)
            opt.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=use_amp):
                loss = criterion(model(x), y)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            run_loss += loss.item() * len(y)
            seen += len(y)
        sched.step()

        mae, sacc, tacc = evaluate(model, val_ld, device, use_amp)
        mae_s = "/".join(f"{m:.3f}" for m in mae)
        print(f"[{epoch:02d}/{args.epochs}] loss={run_loss / max(seen,1):.4f}  "
              f"val MAE(wc/v/c)={mae_s}  season_acc={sacc:.3f}  type_acc={tacc:.3f}",
              flush=True)

        if sacc > best_acc:
            best_acc = sacc
            torch.save({
                "state_dict": model.state_dict(),
                "arch": args.arch,
                "axes": AXES,
                "img_size": args.size,
                "normalize": {"mean": IMAGENET_MEAN, "std": IMAGENET_STD},
                "val_mae": mae, "val_season_acc": sacc, "val_type_acc": tacc,
                "epoch": epoch,
            }, best_path)

    print(f"\n최고 val season_acc={best_acc:.3f}  -> 저장: {best_path}")
    # 네이티브 스레드 finalize 충돌(SIGABRT) 회피: 정상 경로에서 즉시 종료.
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)


if __name__ == "__main__":
    main()
