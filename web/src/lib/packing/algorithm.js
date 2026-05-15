/**
 * 3D Bin Packing Algorithm using the "Maximal Space" approach.
 *
 * The algorithm maintains a list of free spaces inside the container.
 * For each box (sorted by volume, largest first), it finds the best
 * available space using a "First Fit Decreasing with Bottom-Left-Front"
 * heuristic and then splits the remaining space around the placed box.
 *
 * NOTE: This file is a straight port of the original algorithm.ts — logic unchanged.
 */

export function packBoxes(boxes, container) {
  const placed = [];
  const unplaced = [];

  const sortedBoxes = [...boxes].sort(
    (a, b) => b.length * b.width * b.height - a.length * b.width * a.height
  );

  let freeSpaces = [
    {
      x: 0,
      y: 0,
      z: 0,
      length: container.length,
      height: container.height,
      width: container.width,
    },
  ];

  for (const box of sortedBoxes) {
    const rotations = getRotations(box);

    let bestSpace = null;
    let bestRotation = null;
    let bestScore = Infinity;

    for (const rotation of rotations) {
      for (const space of freeSpaces) {
        if (canFit(rotation, space)) {
          const score = space.y * 10000 + space.x * 100 + space.z;
          if (score < bestScore) {
            bestScore = score;
            bestSpace = space;
            bestRotation = rotation;
          }
        }
      }
    }

    if (bestSpace && bestRotation) {
      const placedBox = {
        ...box,
        length: bestRotation.length,
        width: bestRotation.width,
        height: bestRotation.height,
        posX: bestSpace.x,
        posY: bestSpace.y,
        posZ: bestSpace.z,
        placed: true,
      };
      placed.push(placedBox);

      freeSpaces = splitSpace(freeSpaces, bestSpace, placedBox);
    } else {
      unplaced.push({
        ...box,
        placed: false,
        reason: "No available space in container",
      });
    }
  }

  const containerVolume = container.length * container.width * container.height;
  const usedVolume = placed.reduce(
    (sum, b) => sum + b.length * b.width * b.height,
    0
  );

  return {
    placed,
    unplaced,
    container,
    utilization: containerVolume > 0 ? usedVolume / containerVolume : 0,
    totalBoxes: boxes.length,
    placedCount: placed.length,
  };
}

function getRotations(box) {
  const l = box.length,
    w = box.width,
    h = box.height;
  const rotations = [
    { length: l, width: w, height: h },
    { length: l, width: h, height: w },
    { length: w, width: l, height: h },
    { length: w, width: h, height: l },
    { length: h, width: l, height: w },
    { length: h, width: w, height: l },
  ];

  const seen = new Set();
  return rotations.filter((r) => {
    const key = `${r.length}-${r.width}-${r.height}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function canFit(rotation, space) {
  return (
    rotation.length <= space.length &&
    rotation.width <= space.width &&
    rotation.height <= space.height
  );
}

function splitSpace(freeSpaces, usedSpace, placedBox) {
  const newSpaces = [];

  for (const space of freeSpaces) {
    if (
      placedBox.posX + placedBox.length <= space.x ||
      placedBox.posX >= space.x + space.length ||
      placedBox.posY + placedBox.height <= space.y ||
      placedBox.posY >= space.y + space.height ||
      placedBox.posZ + placedBox.width <= space.z ||
      placedBox.posZ >= space.z + space.width
    ) {
      newSpaces.push(space);
      continue;
    }

    if (placedBox.posX + placedBox.length < space.x + space.length) {
      newSpaces.push({
        x: placedBox.posX + placedBox.length,
        y: space.y,
        z: space.z,
        length: space.x + space.length - placedBox.posX - placedBox.length,
        height: space.height,
        width: space.width,
      });
    }

    if (placedBox.posX > space.x) {
      newSpaces.push({
        x: space.x,
        y: space.y,
        z: space.z,
        length: placedBox.posX - space.x,
        height: space.height,
        width: space.width,
      });
    }

    if (placedBox.posY + placedBox.height < space.y + space.height) {
      newSpaces.push({
        x: space.x,
        y: placedBox.posY + placedBox.height,
        z: space.z,
        length: space.length,
        height: space.y + space.height - placedBox.posY - placedBox.height,
        width: space.width,
      });
    }

    if (placedBox.posY > space.y) {
      newSpaces.push({
        x: space.x,
        y: space.y,
        z: space.z,
        length: space.length,
        height: placedBox.posY - space.y,
        width: space.width,
      });
    }

    if (placedBox.posZ + placedBox.width < space.z + space.width) {
      newSpaces.push({
        x: space.x,
        y: space.y,
        z: placedBox.posZ + placedBox.width,
        length: space.length,
        height: space.height,
        width: space.z + space.width - placedBox.posZ - placedBox.width,
      });
    }

    if (placedBox.posZ > space.z) {
      newSpaces.push({
        x: space.x,
        y: space.y,
        z: space.z,
        length: space.length,
        height: space.height,
        width: placedBox.posZ - space.z,
      });
    }
  }

  return mergeSpaces(
    newSpaces.filter((s) => s.length > 0.001 && s.height > 0.001 && s.width > 0.001)
  );
}

function mergeSpaces(spaces) {
  const result = [];

  for (let i = 0; i < spaces.length; i++) {
    let isContained = false;
    for (let j = 0; j < spaces.length; j++) {
      if (i === j) continue;
      if (isSpaceContained(spaces[i], spaces[j])) {
        isContained = true;
        break;
      }
    }
    if (!isContained) {
      result.push(spaces[i]);
    }
  }

  return result;
}

function isSpaceContained(inner, outer) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.z >= outer.z &&
    inner.x + inner.length <= outer.x + outer.length + 0.001 &&
    inner.y + inner.height <= outer.y + outer.height + 0.001 &&
    inner.z + inner.width <= outer.z + outer.width + 0.001
  );
}
