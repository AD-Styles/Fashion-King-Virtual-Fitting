import {
  BufferAttribute,
  Material,
  Mesh,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from "three";

const MAX_INFLUENCES = 4;
const EPSILON = 0.001;

function calculateAutoSkinning(
  mesh: Mesh,
  bonePositions: Vector3[],
): { skinIndices: Uint16Array; skinWeights: Float32Array } {
  const geom = mesh.geometry;
  const positions = geom.attributes.position;
  const vertexCount = positions.count;

  const skinIndices = new Uint16Array(vertexCount * MAX_INFLUENCES);
  const skinWeights = new Float32Array(vertexCount * MAX_INFLUENCES);

  mesh.updateMatrixWorld(true);
  const worldMatrix = mesh.matrixWorld;
  const vertexWorld = new Vector3();
  const ranking: { idx: number; dist: number }[] = bonePositions.map((_, i) => ({
    idx: i,
    dist: 0,
  }));

  for (let i = 0; i < vertexCount; i++) {
    vertexWorld.fromBufferAttribute(positions, i).applyMatrix4(worldMatrix);

    for (let j = 0; j < bonePositions.length; j++) {
      ranking[j].idx = j;
      ranking[j].dist = vertexWorld.distanceTo(bonePositions[j]);
    }
    ranking.sort((a, b) => a.dist - b.dist);

    let totalW = 0;
    const tmp: number[] = [];
    for (let j = 0; j < MAX_INFLUENCES; j++) {
      const d = ranking[j].dist;
      const w = 1 / (d * d + EPSILON);
      tmp.push(w);
      totalW += w;
    }
    for (let j = 0; j < MAX_INFLUENCES; j++) {
      skinIndices[i * MAX_INFLUENCES + j] = ranking[j].idx;
      skinWeights[i * MAX_INFLUENCES + j] = tmp[j] / totalW;
    }
  }

  return { skinIndices, skinWeights };
}

function convertMeshToSkinned(mesh: Mesh, skeleton: Skeleton): SkinnedMesh {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const skinned = new SkinnedMesh(mesh.geometry, material as Material);
  skinned.name = mesh.name;
  skinned.castShadow = mesh.castShadow;
  skinned.receiveShadow = mesh.receiveShadow;
  skinned.position.copy(mesh.position);
  skinned.quaternion.copy(mesh.quaternion);
  skinned.scale.copy(mesh.scale);

  skinned.bind(skeleton, mesh.matrixWorld);
  return skinned;
}

export function applySkinningToObject(root: Object3D, skeleton: Skeleton): number {
  skeleton.bones[0]?.updateMatrixWorld(true);
  const bonePositions = skeleton.bones.map((b) => {
    const p = new Vector3();
    b.getWorldPosition(p);
    return p;
  });

  const meshes: Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const maybe = obj as Mesh;
    if (maybe.isMesh && !(maybe as SkinnedMesh).isSkinnedMesh) {
      meshes.push(maybe);
    }
  });

  let converted = 0;
  for (const mesh of meshes) {
    const { skinIndices, skinWeights } = calculateAutoSkinning(mesh, bonePositions);
    mesh.geometry.setAttribute(
      "skinIndex",
      new BufferAttribute(skinIndices, MAX_INFLUENCES),
    );
    mesh.geometry.setAttribute(
      "skinWeight",
      new BufferAttribute(skinWeights, MAX_INFLUENCES),
    );

    const skinned = convertMeshToSkinned(mesh, skeleton);

    const parent = mesh.parent;
    if (parent) {
      parent.add(skinned);
      parent.remove(mesh);
      converted++;
    }
  }
  return converted;
}
