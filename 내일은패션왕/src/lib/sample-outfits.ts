import { Outfit } from "@/types";

export const SAMPLE_OUTFITS: Outfit[] = [
  {
    id: "top-shirt-dress-glb",
    name: "정장 셔츠",
    category: "top",
    modelPath: "/models/clothing/shirt-dress.glb",
    color: "#f5f5f5",
  },
  {
    id: "top-jacket-casual-glb",
    name: "캐주얼 재킷",
    category: "top",
    modelPath: "/models/clothing/jacket-casual.glb",
    color: "#8d6e63",
  },
  {
    id: "top-white-shirt-glb",
    name: "흰 셔츠 (구)",
    category: "top",
    modelPath: "/models/clothing/tshirt-white.glb",
    color: "#f5f5f5",
  },
  {
    id: "bottom-jeans-male-glb",
    name: "남성 청바지",
    category: "bottom",
    modelPath: "/models/clothing/jeans-male.glb",
    color: "#1565c0",
  },
  {
    id: "bottom-blue-jeans-glb",
    name: "청바지 (구)",
    category: "bottom",
    modelPath: "/models/clothing/jeans-blue.glb",
    color: "#283593",
  },
  {
    id: "dress-red-glb",
    name: "빨간 원피스",
    category: "dress",
    modelPath: "/models/clothing/dress-red.glb",
    color: "#c62828",
  },
  {
    id: "shoes-sneakers-adidas-glb",
    name: "아디다스 운동화",
    category: "shoes",
    modelPath: "/models/clothing/sneakers-adidas.glb",
    color: "#212121",
  },
  {
    id: "shoes-white-sneakers-glb",
    name: "흰 운동화 (구)",
    category: "shoes",
    modelPath: "/models/clothing/sneakers-white.glb",
    color: "#fafafa",
  },
  {
    id: "accessory-cap-baseball-glb",
    name: "야구 모자 (NY)",
    category: "accessory",
    modelPath: "/models/clothing/cap-baseball-ny.glb",
    color: "#1a237e",
  },
  {
    id: "accessory-yellow-hat-glb",
    name: "노란 모자 (구)",
    category: "accessory",
    modelPath: "/models/clothing/hat-yellow.glb",
    color: "#ffd700",
    attachedTransform: {
      rotation: [0, -Math.PI / 2, 0],
    },
  },

  {
    id: "top-red-tshirt",
    name: "빨간 티 (박스)",
    category: "top",
    modelPath: "",
    color: "#e53935",
  },
  {
    id: "top-navy-hoodie",
    name: "네이비 후디 (박스)",
    category: "top",
    modelPath: "",
    color: "#1a237e",
  },
  {
    id: "bottom-black-slacks",
    name: "검정 슬랙스 (박스)",
    category: "bottom",
    modelPath: "",
    color: "#212121",
  },
];
