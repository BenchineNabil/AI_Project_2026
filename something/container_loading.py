import random
import csv


def load_boxes_from_csv(filepath, n=100, seed=None):
    """
    Load n random boxes from a CSV file.
    Expected columns: id, name, length, width, height, weight, fragile
    """
    if seed is not None:
        random.seed(seed)

    with open(filepath, newline='') as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)

    sampled = random.sample(all_rows, min(n, len(all_rows)))

    boxes = []
    for row in sampled:
        b = Box(
            l       = int(row['length']),
            w       = int(row['width']),
            h       = int(row['height']),
            weight  = int(row['weight']),
            fragile = (row['fragile'].strip().lower() == 'true')
        )
        boxes.append(b)

    return boxes


# ── Constants ──────────────────────────────────────────────────────────────────
CONTAINER_L = 589
CONTAINER_W = 235
CONTAINER_H = 239


# ── Box ────────────────────────────────────────────────────────────────────────
class Box:
    def __init__(self, l, w, h, weight=1, fragile=False):
        self.l = l
        self.w = w
        self.h = h
        self.weight = weight
        self.fragile = fragile

    def volume(self):
        return self.l * self.w * self.h

    def orientations(self):
        """
        Return all unique (l, w, h) rotations.
        Fragile boxes cannot be flipped upside-down, so their height stays fixed
        (only l/w can be swapped).
        """
        l, w, h = self.l, self.w, self.h
        if self.fragile:
            return list({(l, w, h), (w, l, h)})
        return list({
            (l, w, h), (l, h, w),
            (w, l, h), (w, h, l),
            (h, l, w), (h, w, l),
        })

    def __repr__(self):
        return f"Box({self.l}x{self.w}x{self.h}, w={self.weight}, fragile={self.fragile})"


# ── Placed box record ──────────────────────────────────────────────────────────
class PlacedBox:
    def __init__(self, box, x, y, z, l, w, h):
        self.box = box        # reference to original Box
        self.x, self.y, self.z = x, y, z
        self.l, self.w, self.h = l, w, h  # actual orientation used

    #calculate the extereme point (chghol rana placed fi 0,0,0 hadi tmdlk lwin rah la7eg l box (ab3d no9ta ml box 3la l origin t3o))
    def x2(self): return self.x + self.l
    def y2(self): return self.y + self.w
    def z2(self): return self.z + self.h

    def __repr__(self):
        return (f"PlacedBox @ ({self.x},{self.y},{self.z}) "
                f"size {self.l}x{self.w}x{self.h}")


# ── Environment ────────────────────────────────────────────────────────────────
class Container:
    def __init__(self, L=CONTAINER_L, W=CONTAINER_W, H=CONTAINER_H):
        self.L = L
        self.W = W
        self.H = H
        self.placed: list[PlacedBox] = []

    # ── Geometry helpers ───────────────────────────────────────────────────────

    def _fits_in_container(self, x, y, z, l, w, h) -> bool:
        return (x + l <= self.L and
                y + w <= self.W and
                z + h <= self.H)

    def _overlaps_any(self, x, y, z, l, w, h) -> bool:
        """AABB check against every already-placed box."""
        for p in self.placed:
            if (x  < p.x2() and x + l > p.x and
                y  < p.y2() and y + w > p.y and
                z  < p.z2() and z + h > p.z):
                return True
        return False

    def _is_supported(self, x, y, z, l, w) -> bool:
        """
        A box at height z is supported if:
          - it rests on the floor (z == 0), OR
          - at least one already-placed box has its top face exactly at z
            AND its footprint overlaps ours.
        """

        #i need to recheck the logic cuz it's doesn't make sense . (hadi prblm fiha ida kan box kbir msuporti ghi men coin wa7d rah maykonch stable w rah y9der yn9leb 3la 7sab l position t3o f container a rah mdyor bli aho suported)
        if z == 0:
            return True
        for p in self.placed:
            if p.z2() == z:
                # check footprint overlap in X and Y
                if (x  < p.x2() and x + l > p.x and
                    y  < p.y2() and y + w > p.y):
                    return True
        return False

    # ── Candidate positions ────────────────────────────────────────────────────

    def _extreme_points(self) -> list[tuple]:
        """
        Generate candidate (x, y, z) positions to try placing the next box.
        The origin (0,0,0) is always included.
        For each placed box we add the three 'extreme' corners it creates.
        (chghol hadi t generati g3 l posible places w mba3d ki ntryiwhom ida kan kayn box deja hnek yskipiha w ida kan makaynch yplaceiha)
        """
        points = {(0, 0, 0)}
        for p in self.placed:
            points.add((p.x2(), p.y,  p.z))
            points.add((p.x,  p.y2(), p.z))
            points.add((p.x,  p.y,  p.z2()))
        return list(points)

    # ── Public API ─────────────────────────────────────────────────────────────

    def try_place(self, box: Box) -> bool:
        """
        Try every (orientation x extreme_point) combination.
        Place the box at the first valid position found.
        Returns True if placed, False if the box does not fit anywhere.
        """
        candidates = self._extreme_points()
        for (x, y, z) in candidates:
            for (l, w, h) in box.orientations():
                if (self._fits_in_container(x, y, z, l, w, h) and
                        not self._overlaps_any(x, y, z, l, w, h) and
                        self._is_supported(x, y, z, l, w)):
                    self.placed.append(PlacedBox(box, x, y, z, l, w, h))
                    return True
        return False

    def reset(self):
        self.placed = []

    # ── Metrics ────────────────────────────────────────────────────────────────

    def volume_utilization(self) -> float:
        packed = sum(p.l * p.w * p.h for p in self.placed)
        return packed / (self.L * self.W * self.H) * 100

    def __repr__(self):
        return (f"Container({self.L}x{self.W}x{self.H}) "
                f"— {len(self.placed)} boxes packed, "
                f"{self.volume_utilization():.1f}% utilization")


# ── Greedy algorithm ───────────────────────────────────────────────────────────

def greedy(container: Container, boxes: list[Box]) -> dict:
    """
    Best-Fit Decreasing greedy:
    1. Sort boxes by volume, largest first.
    2. Try to place each box; track those that did not fit.
    """
    container.reset()
    sorted_boxes = sorted(boxes, key=lambda b: b.volume(), reverse=True)
    unpacked = []

    for box in sorted_boxes:
        placed = container.try_place(box)
        if not placed:
            unpacked.append(box)

    return {
        "packed":      len(container.placed),
        "order_placed": [p.box for p in container.placed], #this will be a huge list, placed here to check brk
        "unpacked":    len(unpacked),
        "utilization": container.volume_utilization(),
        "unpacked_boxes": unpacked,
    }


# ── Dataset generator ──────────────────────────────────────────────────────────

def generate_boxes(n=100) -> list[Box]:
    boxes = []
    boxes = load_boxes_from_csv('/data/data.csv', n)
    # for _ in range(n):
    #     l = random.randint(10, 150)
    #     w = random.randint(10, 150)
    #     h = random.randint(10, 150)
    #     weight  = random.randint(1, 50)
    #     fragile = random.random() < 0.15   # 15 % chance
    #     boxes.append(Box(l, w, h, weight, fragile))
    return boxes


# ── Tests ──────────────────────────────────────────────────────────────────────

def test_overlap_detection():
    c = Container()
    b1 = Box(100, 100, 100)
    b2 = Box(100, 100, 100)
    c.placed.append(PlacedBox(b1, 0, 0, 0, 100, 100, 100))
    # same spot — must overlap
    assert c._overlaps_any(0, 0, 0, 100, 100, 100), "FAIL: should detect overlap" #assert is a way to check if a condition is true, if not it raises an AssertionError with the given message
    # adjacent in X — must NOT overlap
    assert not c._overlaps_any(100, 0, 0, 100, 100, 100), "FAIL: adjacent should not overlap"
    print("PASS  test_overlap_detection")


def test_support_check():
    c = Container()
    base = Box(100, 100, 50)
    c.placed.append(PlacedBox(base, 0, 0, 0, 100, 100, 50))
    # box sitting exactly on top of base
    assert c._is_supported(0, 0, 50, 100, 100), "FAIL: should be supported"
    # box floating in the air
    assert not c._is_supported(0, 0, 99, 100, 100), "FAIL: should not be supported"
    print("PASS  test_support_check")


def test_container_bounds():
    c = Container()
    # box that exactly fills the container
    assert c._fits_in_container(0, 0, 0, CONTAINER_L, CONTAINER_W, CONTAINER_H)
    # box one unit too long
    assert not c._fits_in_container(0, 0, 0, CONTAINER_L + 1, CONTAINER_W, CONTAINER_H)
    print("PASS  test_container_bounds")


def test_fragile_orientations():
    b = Box(10, 20, 30, fragile=True)
    orients = b.orientations()
    # fragile: height must stay 30, only l/w swap allowed
    for (l, w, h) in orients:
        assert h == 30, f"FAIL: fragile box height changed to {h}"
    print("PASS  test_fragile_orientations")


def test_greedy_small():
    c = Container()
    # 8 boxes that perfectly tile a 20x20x20 cube — all must fit
    boxes = [Box(10, 10, 10) for _ in range(8)]
    result = greedy(c, boxes)
    assert result["unpacked"] == 0, f"FAIL: {result['unpacked']} boxes did not fit"
    print("PASS  test_greedy_small")


def test_greedy_full():
    c   = Container()
    boxes = generate_boxes(100)
    result = greedy(c, boxes)
    print(f"PASS  test_greedy_full  — "
          f"{result['packed']} packed, "
          f"{result['unpacked']} unpacked, "
          f"{result['utilization']:.1f}% utilization")


def run_all_tests():
    print("=" * 50)
    print("Running tests...")
    print("=" * 50)
    test_overlap_detection()
    test_support_check()
    test_container_bounds()
    test_fragile_orientations()
    test_greedy_small()
    test_greedy_full()
    print("=" * 50)
    print("All tests passed.")
    print("=" * 50)


if __name__ == "__main__":
    run_all_tests()

    print()
    print("        Demo run       ")
    container = Container()
    boxes     = generate_boxes(100)
    result    = greedy(container, boxes)
    print(container)
    print(f"Packed:   {result['packed']}")
    print(f"Order placed: {result['order_placed']}")
    print(f"Unpacked: {result['unpacked']}")
    print(f"Volume utilization: {result['utilization']:.1f}%")


#BTWWWWWWW ya zah ai rah ycomenti m3aya bl darija