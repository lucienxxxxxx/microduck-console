"""把官方 MJCF 站立姿态烘焙成前端可直接摆放的零件清单。"""

import json
import math
import struct
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path("/tmp/microduck-src/microduck_rl/src/mjlab_microduck/robot/microduck")
OUT_DIR = Path("/home/lew/codebase/myProjects/microduck-console/public")
MODEL_DIR = OUT_DIR / "models"

# 官网实机观感。CAD 原色另存为预设。
ZONES = [
    ("shell", "外壳", "头壳、侧壳、大腿", "#F4F1E6", {"left_shell", "right_shell", "top_head_shell", "upper_leg_left", "upper_leg_right"}),
    ("cheek", "脸颊", "下头壳", "#FF7A2F", {"bottom_head_shell"}),
    ("beak", "嘴巴", "硬喙", "#FFD22F", {"jaw"}),
    ("soft", "软嘴", "软胶嘴", "#F0C4E8", {"jaw_soft", "soft_mouth_top"}),
    ("eye", "眼圈", "镜头外环", "#FFD22F", {"noenoeil"}),
    ("face", "脸架", "面部结构", "#C8BEB4", {"face_part"}),
    ("feet", "脚", "脚掌与脚踝", "#FF7A2F", {"foot_left", "foot_right", "ankle_left", "ankle_right"}),
    ("sole", "鞋底", "脚底", "#FFD22F", {"sole_left", "sole_right"}),
    ("frame", "骨架", "躯干与髋轴", "#161A18", {"trunk_base", "yaw2roll", "bearing_roll", "motor_support", "yaw_roll_motion"}),
    ("structure", "结构件", "腿、颈、支架", "#D7D0C6", {"hip_l", "leg", "neck", "power_support", "upper_leg_rigidity_plate"}),
    ("neck", "颈关节", "颈部机件", "#3E4650", {"neck_pitch"}),
    ("servo", "舵机", "XL330", "#2C2C2C", {"xl330"}),
    ("bearing", "轴承", "金属圈", "#D5DDE4", {"seeed_bearing__configuration__22x16x4", "seeed_bearing__configuration_default"}),
    ("lens", "镜头", "摄像头", "#14181C", {"lens", "m12_lens_holder"}),
    ("electronics", "电子", "板子、电池、喇叭", "#3F5348", {"elec_rpi_robot_hat_pcb", "pcb__raspberry_pi_zero_2_w", "np_f970", "banana_pcb_locker", "speaker"}),
]


def eye():
    return [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 1.0]]


def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def translate(x, y, z):
    m = eye()
    m[0][3], m[1][3], m[2][3] = x, y, z
    return m


def rotate_quat(w, x, y, z):
    n = math.sqrt(w * w + x * x + y * y + z * z) or 1.0
    w, x, y, z = w / n, x / n, y / n, z / n
    return [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0.0],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0.0],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0.0],
        [0.0, 0.0, 0.0, 1.0],
    ]


def quat_from_axis_angle(axis, angle):
    x, y, z = axis
    n = math.sqrt(x * x + y * y + z * z) or 1.0
    x, y, z = x / n, y / n, z / n
    s = math.sin(angle / 2.0)
    return (math.cos(angle / 2.0), x * s, y * s, z * s)


def parse_floats(text):
    return [float(part) for part in text.split()]


def column_major(m):
    return [m[row][col] for col in range(4) for row in range(4)]


def transform_point(m, x, y, z):
    return (
        m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3],
        m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3],
        m[2][0] * x + m[2][1] * y + m[2][2] * z + m[2][3],
    )


def stl_bounds(path):
    data = path.read_bytes()
    if data[:5].lower() == b"solid" and b"\n" in data[:80]:
        # 可能是 ASCII；官方网格基本是二进制，这里只做兜底
        mins = [math.inf, math.inf, math.inf]
        maxs = [-math.inf, -math.inf, -math.inf]
        for line in data.decode("utf-8", "ignore").splitlines():
            parts = line.split()
            if parts and parts[0] == "vertex" and len(parts) >= 4:
                for i in range(3):
                    value = float(parts[i + 1])
                    mins[i] = min(mins[i], value)
                    maxs[i] = max(maxs[i], value)
        return mins, maxs
    count = struct.unpack_from("<I", data, 80)[0]
    mins = [math.inf, math.inf, math.inf]
    maxs = [-math.inf, -math.inf, -math.inf]
    offset = 84
    for _ in range(count):
        nums = struct.unpack_from("<12f", data, offset)
        for v in range(3):
            for i in range(3):
                value = nums[3 + v * 3 + i]
                mins[i] = min(mins[i], value)
                maxs[i] = max(maxs[i], value)
        offset += 50
    return mins, maxs


def load_stand_angles(scene_path):
    root = ET.parse(scene_path).getroot()
    for key in root.findall("./keyframe/key"):
        if key.get("name") == "STAND":
            values = parse_floats(key.get("qpos", ""))
            # 自由关节 7 个数，后面每个铰链 1 个
            return values[7:]
    raise SystemExit("scene 里没有 STAND 姿态")


def main():
    robot = ET.parse(ROOT / "robot_walk.xml").getroot()
    angles = load_stand_angles(ROOT / "scene_walk.xml")
    materials = {}
    for mat in robot.findall("./asset/material"):
        rgba = parse_floats(mat.get("rgba", "1 1 1 1"))
        materials[mat.get("name")] = rgba

    zone_by_mesh = {}
    for zone_id, _label, _hint, _color, meshes in ZONES:
        for mesh in meshes:
            zone_by_mesh[mesh] = zone_id

    angle_index = 0
    instances = []
    used_meshes = set()
    joint_log = []

    def walk(body, parent):
        nonlocal angle_index
        pos = parse_floats(body.get("pos", "0 0 0"))
        quat = parse_floats(body.get("quat", "1 0 0 0"))
        freejoint = body.find("freejoint") is not None
        if freejoint:
            # 自由关节的 qpos 就是躯干在世界里的位姿，XML 里的 pos 已包含在关键帧中
            frame = matmul(translate(0.0, 0.0, 0.12), rotate_quat(1, 0, 0, 0))
        else:
            frame = matmul(translate(*pos), rotate_quat(*quat))
            joint = body.find("joint")
            if joint is not None and joint.get("type", "hinge") == "hinge":
                axis = parse_floats(joint.get("axis", "0 0 1"))
                angle = angles[angle_index]
                angle_index += 1
                joint_log.append((joint.get("name"), round(angle, 4)))
                w, x, y, z = quat_from_axis_angle(axis, angle)
                frame = matmul(frame, rotate_quat(w, x, y, z))
        world = matmul(parent, frame)

        for geom in list(body):
            if geom.tag != "geom":
                continue
            if geom.get("class") != "visual":
                continue
            if geom.get("type", "sphere") != "mesh":
                continue
            mesh = geom.get("mesh")
            gpos = parse_floats(geom.get("pos", "0 0 0"))
            gquat = parse_floats(geom.get("quat", "1 0 0 0"))
            placed = matmul(world, matmul(translate(*gpos), rotate_quat(*gquat)))
            rgba = materials.get(geom.get("material"), [0.8, 0.8, 0.8, 1])
            instances.append(
                {
                    "mesh": mesh,
                    "file": f"{mesh}.stl",
                    "zone": zone_by_mesh.get(mesh, "misc"),
                    "matrix": [round(v, 7) for v in column_major(placed)],
                    "cad": [round(channel, 6) for channel in rgba[:3]],
                }
            )
            used_meshes.add(mesh)

        for child in list(body):
            if child.tag == "body":
                walk(child, world)

    worldbody = robot.find("worldbody")
    for body in list(worldbody):
        if body.tag == "body":
            walk(body, eye())

    if angle_index != len(angles):
        raise SystemExit(f"关节数量对不上：用了 {angle_index}，关键帧有 {len(angles)}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    bounds = {}
    world_min = [math.inf, math.inf, math.inf]
    world_max = [-math.inf, -math.inf, -math.inf]
    for mesh in sorted(used_meshes):
        src = ROOT / "assets" / f"{mesh}.stl"
        if not src.exists() or src.stat().st_size < 100:
            raise SystemExit(f"缺少网格 {src}")
        target = MODEL_DIR / f"{mesh}.stl"
        target.write_bytes(src.read_bytes())
        bounds[mesh] = stl_bounds(src)

    for item in instances:
        mins, maxs = bounds[item["mesh"]]
        matrix = item["matrix"]
        # 还原成行主序，只为计算包围盒
        m = [[matrix[col * 4 + row] for col in range(4)] for row in range(4)]
        for x in (mins[0], maxs[0]):
            for y in (mins[1], maxs[1]):
                for z in (mins[2], maxs[2]):
                    px, py, pz = transform_point(m, x, y, z)
                    world_min[0] = min(world_min[0], px)
                    world_min[1] = min(world_min[1], py)
                    world_min[2] = min(world_min[2], pz)
                    world_max[0] = max(world_max[0], px)
                    world_max[1] = max(world_max[1], py)
                    world_max[2] = max(world_max[2], pz)

    cad_colors = {}
    for zone_id, _label, _hint, _color, meshes in ZONES:
        for item in instances:
            if item["zone"] == zone_id and zone_id not in cad_colors:
                cad_colors[zone_id] = "#{:02X}{:02X}{:02X}".format(
                    int(item["cad"][0] * 255),
                    int(item["cad"][1] * 255),
                    int(item["cad"][2] * 255),
                )

    zones = []
    for zone_id, label, hint, color, _meshes in ZONES:
        count = sum(1 for item in instances if item["zone"] == zone_id)
        if count == 0:
            continue
        zones.append(
            {
                "id": zone_id,
                "label": label,
                "hint": hint,
                "color": color,
                "cad": cad_colors.get(zone_id, color),
                "count": count,
            }
        )

    payload = {
        "source": "pollen-robotics/microduck_rl robot_walk.xml STAND pose",
        "license": "CC BY-NC-SA 4.0",
        "upAxis": "Z",
        "bounds": {"min": [round(v, 4) for v in world_min], "max": [round(v, 4) for v in world_max]},
        "zones": zones,
        "instances": [{k: v for k, v in item.items() if k != "cad"} for item in instances],
    }
    (OUT_DIR / "assembly.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print("instances", len(instances))
    print("meshes", len(used_meshes))
    print("joints", joint_log)
    print("bounds", payload["bounds"])
    print("zones", [(z["id"], z["count"]) for z in zones])


if __name__ == "__main__":
    main()
