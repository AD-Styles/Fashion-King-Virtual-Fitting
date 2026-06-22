# Mannequin Models

이 폴더에 마네킹 `.glb` 또는 `.gltf` 파일을 둡니다. `.gitignore`에 의해 커밋되지 않습니다 (모델 파일이 크기 때문).

## 출처 후보

| 소스 | 라이선스 | 비고 |
|------|----------|------|
| [Ready Player Me](https://readyplayer.me/) | API 무료 (트래픽 제한) | API로 .glb 받기. 만화풍. |
| [Sketchfab](https://sketchfab.com/3d-models/categories/people?features=downloadable&sort_by=-likeCount) | CC0/CC-BY 다양 | "mannequin", "base mesh" 검색 |
| [Mixamo](https://www.mixamo.com/) | 무료 (상업 사용 가능) | rigged 인체 + 애니메이션. .fbx → glTF 변환 필요. |
| [MakeHuman](http://www.makehumancommunity.org/) | AGPL/CC0 | 데스크톱 도구. 직접 모델링 후 export. |
| [VRoid Hub](https://hub.vroid.com/) | 모델별 상이 | VRM 포맷 (애니메이션 친화). |

## 권장 시작

`base-mannequin.glb` 라는 이름으로 한 개 두기. 이후 `Mannequin.tsx`에서 `useGLTF('/models/mannequin/base-mannequin.glb')`로 로드.

## 체크리스트

- [ ] 메쉬가 단일 SkinnedMesh이거나, 본(skeleton)이 표준 휴머노이드 구조
- [ ] Morph target이 포함되어 있다면 이름 확인 (`shoulder_wide`, `chest_big` 등)
- [ ] 파일 크기 < 10MB (모바일 대역폭)
- [ ] Y축이 위쪽, 발이 Y=0에 닿도록 export
