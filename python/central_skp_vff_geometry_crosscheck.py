#!/usr/bin/env python3
"""Read-only exact geometry cross-check for modern SketchUp VFF files (2021+).

Purpose
-------
This is an independent fallback/cross-check for the native SketchUp Ruby path.
It reads only the documented VFF/TLV geometry and component-instance records
from ``model.dat`` inside a modern ``.skp`` package, resolves nested instance
transforms into world space, and reports:

* RAW_MODEL_BOUNDS in millimetres
* definition count
* root vertices / root instances
* full-hierarchy used instance count
* unique stored instance-record count
* per-definition unique vs used counts

Safety / governance
-------------------
* read-only; never writes the input SKP
* no network
* no shell/subprocess
* no eval/exec
* no credentials
* no prices or semantic room dimensions are inferred
* RAW_MODEL_BOUNDS is geometry truth for all stored geometry; it MUST NOT be
  treated as the architectural room envelope when backgrounds/outliers exist.
* CORE_SPATIAL_BOUNDS must be created separately by an explicit, evidenced
  filter/semantic-QA policy and labelled as a candidate until verified.

The tag layout follows the public modern-VFF documentation independently
implemented by OpenSKP (MIT) and is used here only for a narrow read-only
cross-check. The native SketchUp V2 exporter remains the authoritative second
path when the local SketchUp runtime is available.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import mmap
import struct
import time
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Mapping, MutableMapping, Optional, Sequence, Tuple

SCHEMA_VERSION = "SKP_EXACT_GEOMETRY_CROSSCHECK_V1"
METHOD = "VFF_TLV_DOCUMENTED_TAGS+FULL_WORLD_INSTANCE_TRAVERSAL"
MM_PER_INCH = 25.4
IDENTITY_13 = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]


def _u32(data: mmap.mmap, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def _f64(data: mmap.mmap, offset: int) -> float:
    return struct.unpack_from("<d", data, offset)[0]


def _varint_le(raw: bytes) -> int:
    value = 0
    for i, byte in enumerate(raw):
        value |= byte << (8 * i)
    return value


def _children(data: mmap.mmap, start: int, end: int) -> Iterator[Tuple[str, int, int]]:
    pos = start
    while pos <= end - 6:
        size = _u32(data, pos + 2)
        if size < 0 or pos + 6 + size > end:
            break
        yield data[pos : pos + 2].hex().upper(), pos, size
        pos += 6 + size


def _child_map(data: mmap.mmap, pos: int, size: int) -> Dict[str, Tuple[int, int]]:
    return {tag: (off, n) for tag, off, n in _children(data, pos + 6, pos + 6 + size)}


def _entity_id(data: mmap.mmap, pos: int, size: int) -> Optional[int]:
    for tag, off, n in _children(data, pos + 6, pos + 6 + size):
        if tag == "DC05":
            raw = bytes(data[off + 6 : off + 6 + n])
            if len(raw) >= 6 and raw[:2] == b"\xde\x05":
                ln = struct.unpack_from("<I", raw, 2)[0]
                return _varint_le(raw[6 : 6 + ln])
        if tag == "DE05":
            return _varint_le(bytes(data[off + 6 : off + 6 + n]))
    return None


def _parse_vertices(data: mmap.mmap, pos: int, size: int) -> Dict[int, Tuple[float, float, float]]:
    out: Dict[int, Tuple[float, float, float]] = {}
    for tag, off, n in _children(data, pos + 6, pos + 6 + size):
        if tag != "C409":
            continue
        entity_id = _entity_id(data, off, n)
        coords = _child_map(data, off, n).get("C509")
        if entity_id is None or not coords or coords[1] < 24:
            continue
        q = coords[0] + 6
        out[entity_id] = (_f64(data, q), _f64(data, q + 8), _f64(data, q + 16))
    return out


def _parse_instance(data: mmap.mmap, pos: int, size: int) -> Dict[str, object]:
    cm = _child_map(data, pos, size)
    ref = cm.get("6719")
    matrix = cm.get("6619")
    name = cm.get("6519")
    ref_idx = _varint_le(bytes(data[ref[0] + 6 : ref[0] + 6 + ref[1]])) if ref else None
    transform = [_f64(data, matrix[0] + 6 + i * 8) for i in range(13)] if matrix and matrix[1] >= 104 else []
    label = bytes(data[name[0] + 6 : name[0] + 6 + name[1]]).decode("utf-8", errors="replace") if name else ""
    return {"ref_idx": ref_idx, "matrix": transform, "name": label}


def _parse_instances(data: mmap.mmap, pos: int, size: int) -> List[Dict[str, object]]:
    out: List[Dict[str, object]] = []
    for tag, off, n in _children(data, pos + 6, pos + 6 + size):
        if tag == "6419":
            out.append(_parse_instance(data, off, n))
        elif tag == "4C1D":
            for tag2, off2, n2 in _children(data, off + 6, off + 6 + n):
                if tag2 == "6419":
                    out.append(_parse_instance(data, off2, n2))
        elif tag == "9013":
            # Image wrapper. Search only the documented shallow placement path.
            for tag2, off2, n2 in _children(data, off + 6, off + 6 + n):
                if tag2 != "401F":
                    continue
                for tag3, off3, n3 in _children(data, off2 + 6, off2 + 6 + n2):
                    if tag3 == "6419":
                        out.append(_parse_instance(data, off3, n3))
    return out


def _parse_entities(data: mmap.mmap, pos: int, size: int) -> Tuple[Optional[int], Dict[int, Tuple[float, float, float]], List[Dict[str, object]]]:
    entity_id: Optional[int] = None
    vertices: Dict[int, Tuple[float, float, float]] = {}
    instances: List[Dict[str, object]] = []
    for tag, off, n in _children(data, pos + 6, pos + 6 + size):
        if tag == "D007" and entity_id is None:
            entity_id = _entity_id(data, off, n)
        elif tag == "8913":
            vertices.update(_parse_vertices(data, off, n))
        elif tag in ("8C13", "8D13", "9013"):
            instances.extend(_parse_instances(data, off, n))
    return entity_id, vertices, instances


def _navigate(data: mmap.mmap) -> Tuple[List[Tuple[str, int, int]], Optional[Tuple[str, int, int]]]:
    roots = list(_children(data, 16, len(data)))
    definitions_root = next((x for x in roots if x[0] == "F901"), None)
    model_root = next((x for x in roots if x[0] == "F601"), None)
    definitions: List[Tuple[str, int, int]] = []
    if definitions_root:
        c1 = next((x for x in _children(data, definitions_root[1] + 6, definitions_root[1] + 6 + definitions_root[2]) if x[0] == "7017"), None)
        if c1:
            c2 = next((x for x in _children(data, c1[1] + 6, c1[1] + 6 + c1[2]) if x[0] == "7117"), None)
            if c2:
                definitions = [x for x in _children(data, c2[1] + 6, c2[1] + 6 + c2[2]) if x[0] == "7C15"]
    return definitions, model_root


def _matmul(a: Sequence[float], b: Sequence[float]) -> List[float]:
    if not a:
        return list(b)
    if not b:
        return list(a)
    p0 = [a[0], a[1], a[2], a[9]]
    p1 = [a[3], a[4], a[5], a[10]]
    p2 = [a[6], a[7], a[8], a[11]]
    cols = [[b[0], b[3], b[6], 0], [b[1], b[4], b[7], 0], [b[2], b[5], b[8], 0], [b[9], b[10], b[11], 1]]

    def dot(row: Sequence[float], col: Sequence[float]) -> float:
        return sum(x * y for x, y in zip(row, col))

    out = [0.0] * 13
    out[0], out[1], out[2], out[9] = [dot(p0, c) for c in cols]
    out[3], out[4], out[5], out[10] = [dot(p1, c) for c in cols]
    out[6], out[7], out[8], out[11] = [dot(p2, c) for c in cols]
    out[12] = (a[12] if len(a) > 12 else 1.0) * (b[12] if len(b) > 12 else 1.0)
    return out


def _transform(point: Tuple[float, float, float], matrix: Sequence[float]) -> Tuple[float, float, float]:
    if not matrix:
        return point
    x, y, z = point
    return (
        matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[9],
        matrix[3] * x + matrix[4] * y + matrix[5] * z + matrix[10],
        matrix[6] * x + matrix[7] * y + matrix[8] * z + matrix[11],
    )


def _extract_model_dat(skp_path: Path, temp_dir: Path) -> Path:
    if skp_path.name.lower() == "model.dat":
        return skp_path
    with skp_path.open("rb") as source:
        prefix = source.read(64)
        # Modern SKP has a header before the embedded ZIP. zipfile can locate the
        # central directory even with leading bytes, so direct open is intentional.
    with zipfile.ZipFile(skp_path, "r") as archive:
        if "model.dat" not in archive.namelist():
            raise ValueError("MODEL_DAT_NOT_FOUND_OR_NOT_MODERN_VFF")
        out = temp_dir / "model.dat"
        with archive.open("model.dat") as src, out.open("wb") as dst:
            while True:
                block = src.read(1024 * 1024)
                if not block:
                    break
                dst.write(block)
        return out


def parse_model_dat(model_dat_path: Path, source_name: str = "") -> Dict[str, object]:
    started = time.time()
    definitions: Dict[int, Dict[str, object]] = {}
    unique_counts: MutableMapping[int, int] = defaultdict(int)

    with model_dat_path.open("rb") as fh:
        data = mmap.mmap(fh.fileno(), 0, access=mmap.ACCESS_READ)
        definition_headers, root_header = _navigate(data)

        for _idx, (_tag, off, size) in enumerate(definition_headers):
            name = ""
            entities = None
            for child_tag, child_off, child_size in _children(data, off + 6, off + 6 + size):
                if child_tag == "7E15":
                    name = bytes(data[child_off + 6 : child_off + 6 + child_size]).decode("utf-8", errors="replace")
                elif child_tag == "8813":
                    entities = (child_off, child_size)
            if not entities:
                continue
            definition_id, vertices, instances = _parse_entities(data, *entities)
            if definition_id is not None:
                definitions[definition_id] = {"name": name, "vertices": vertices, "instances": instances}
            for item in instances:
                rid = item.get("ref_idx")
                if rid is not None:
                    unique_counts[int(rid)] += 1

        root: Dict[str, object] = {"vertices": {}, "instances": []}
        if root_header:
            entities = next((x for x in _children(data, root_header[1] + 6, root_header[1] + 6 + root_header[2]) if x[0] == "8813"), None)
            if entities:
                _, vertices, instances = _parse_entities(data, entities[1], entities[2])
                root = {"vertices": vertices, "instances": instances}
                for item in instances:
                    rid = item.get("ref_idx")
                    if rid is not None:
                        unique_counts[int(rid)] += 1

        mins = [math.inf, math.inf, math.inf]
        maxs = [-math.inf, -math.inf, -math.inf]
        used_counts: MutableMapping[int, int] = defaultdict(int)
        missing: MutableMapping[int, int] = defaultdict(int)
        recursion_guard_hits = 0

        def add(point: Tuple[float, float, float]) -> None:
            for i in range(3):
                mins[i] = min(mins[i], point[i])
                maxs[i] = max(maxs[i], point[i])

        def walk(branch: Mapping[str, object], matrix: Sequence[float], stack: Tuple[int, ...]) -> None:
            nonlocal recursion_guard_hits
            for point in (branch.get("vertices") or {}).values():
                add(_transform(point, matrix))
            for instance in branch.get("instances") or []:
                rid_raw = instance.get("ref_idx")
                if rid_raw is None:
                    continue
                rid = int(rid_raw)
                used_counts[rid] += 1
                if rid in stack:
                    recursion_guard_hits += 1
                    continue
                definition = definitions.get(rid)
                if not definition:
                    missing[rid] += 1
                    continue
                walk(definition, _matmul(matrix, instance.get("matrix") or []), stack + (rid,))

        walk(root, IDENTITY_13, ())
        data.close()

    def mm(value: float) -> float:
        return round(value * MM_PER_INCH, 3)

    bounds: Dict[str, object] = {}
    if all(math.isfinite(x) for x in mins + maxs):
        bounds = {
            "min": [mm(x) for x in mins],
            "max": [mm(x) for x in maxs],
            "width": mm(maxs[0] - mins[0]),
            "depth": mm(maxs[1] - mins[1]),
            "height": mm(maxs[2] - mins[2]),
        }

    components: List[Dict[str, object]] = []
    for definition_id, definition in definitions.items():
        unique_count = int(unique_counts[definition_id])
        used_count = int(used_counts[definition_id])
        if unique_count or used_count:
            components.append(
                {
                    "definition_id": definition_id,
                    "name": definition["name"],
                    "unique_instance_count": unique_count,
                    "used_instance_count": used_count,
                    "vertex_count": len(definition["vertices"]),
                }
            )
    components.sort(key=lambda row: (-int(row["used_instance_count"]), -int(row["unique_instance_count"]), str(row["name"])))

    result: Dict[str, object] = {
        "schema_version": SCHEMA_VERSION,
        "method": METHOD,
        "source_file": source_name or model_dat_path.name,
        "geometry_semantics": {
            "raw_model_bounds": "ALL_STORED_GEOMETRY_WORLD_SPACE",
            "core_spatial_bounds": "NOT_INFERRED;REQUIRES_EXPLICIT_FILTER_AND_SEMANTIC_QA",
            "used_instance_count": "FULL_HIERARCHY_EFFECTIVE_OCCURRENCES",
            "unique_instance_record_count": "STORED_INSTANCE_RECORDS_INSIDE_DEFINITIONS_AND_ROOT",
        },
        "definition_count": len(definitions),
        "root_vertex_count": len(root["vertices"]),
        "root_instance_count": len(root["instances"]),
        "world_bounds_mm": bounds,
        "effective_instance_total": int(sum(used_counts.values())),
        "unique_instance_record_total": int(sum(unique_counts.values())),
        "used_definition_count": int(sum(v > 0 for v in used_counts.values())),
        "unique_definition_count": int(sum(v > 0 for v in unique_counts.values())),
        "missing_definition_refs": dict(missing),
        "recursive_guard_hits": recursion_guard_hits,
        "components": components,
        "elapsed_sec": round(time.time() - started, 3),
    }
    canonical = dict(result)
    canonical.pop("elapsed_sec", None)
    result["canonical_sha256"] = hashlib.sha256(
        json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return result


def parse_skp(skp_path: Path, work_dir: Path) -> Dict[str, object]:
    work_dir.mkdir(parents=True, exist_ok=True)
    model_dat = _extract_model_dat(skp_path, work_dir)
    return parse_model_dat(model_dat, source_name=skp_path.name)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="Modern .skp file or extracted model.dat")
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--work-dir", type=Path, default=Path(".skp_vff_tmp"))
    args = parser.parse_args()

    if args.input.suffix.lower() == ".skp":
        result = parse_skp(args.input, args.work_dir)
    else:
        result = parse_model_dat(args.input, source_name=args.input.name)

    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
