'use strict';

class Point {
    constructor(x=0, y=0, z=0) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.nx = 0; this.ny = 0; this.nz = 0;
        this.r = 1; this.g = 1; this.b = 1; this.a = 1;
    }
}

class Triangle {
    constructor(a, b, c) {
        this.a = a;
        this.b = b;
        this.c = c;
    }
}

class Balloon {
    constructor() {
        this.x = 0; this.y = 0; this.z = 0;
        this.radius = 1.0;
        this.pressure = 1.0;
        this.mesh = [];
        this.point_list = [];
        this.setup_complete = false;
    }

    setup(segments, pies, use_color) {
        this.mesh = [];
        const PI = Math.PI;

        for (let i = 1; i <= segments; i++) {
            for (let j = 0; j < pies; j++) {
                const ytemp1 = this.radius * Math.cos(PI * i / segments);
                const rtemp1 = Math.sqrt(Math.max(0, this.radius * this.radius - ytemp1 * ytemp1));

                const A = new Point(
                    this.x + (rtemp1 * Math.sin(2 * PI * j / pies)),
                    this.y + ytemp1,
                    this.z + (rtemp1 * Math.cos(2 * PI * j / pies))
                );

                const ytemp2 = this.radius * Math.cos(PI * (i - 1) / segments);
                const rtemp2 = Math.sqrt(Math.max(0, this.radius * this.radius - ytemp2 * ytemp2));

                const B = new Point(
                    this.x + (rtemp2 * Math.sin(2 * PI * j / pies)),
                    this.y + ytemp2,
                    this.z + (rtemp2 * Math.cos(2 * PI * j / pies))
                );

                const C = new Point(
                    this.x + (rtemp1 * Math.sin(2 * PI * (j + 1) / pies)),
                    this.y + ytemp1,
                    this.z + (rtemp1 * Math.cos(2 * PI * (j + 1) / pies))
                );

                const D = new Point(
                    this.x + (rtemp2 * Math.sin(2 * PI * (j + 1) / pies)),
                    this.y + ytemp2,
                    this.z + (rtemp2 * Math.cos(2 * PI * (j + 1) / pies))
                );

                // Apply colors and normals to each new vertex instance
                [A, B, C, D].forEach(p => {
                    p.nx = p.x / this.radius;
                    p.ny = p.y / this.radius;
                    p.nz = p.z / this.radius;
                    if (use_color) {
                        if (i % 2 === j % 2) {
                             p.r = 0.2; p.g = 0.2;
                        }
                    }
                });
                
                this.mesh.push(new Triangle(A, C, B));
                this.mesh.push(new Triangle(C, D, B));
            }
        }
        this.updatePointList();
        this.setup_complete = true;
    }

    setupIcosphere(subdivisions, use_color) {
        this.mesh = [];
        const t = (1.0 + Math.sqrt(5.0)) / 2.0;

        // Create 12 vertices of an icosahedron
        const vertices = [
            new Point(-1, t, 0), new Point(1, t, 0), new Point(-1, -t, 0), new Point(1, -t, 0),
            new Point(0, -1, t), new Point(0, 1, t), new Point(0, -1, -t), new Point(0, 1, -t),
            new Point(t, 0, -1), new Point(t, 0, 1), new Point(-t, 0, -1), new Point(-t, 0, 1)
        ];

        // Create 20 triangles of the icosahedron
        let faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];

        const getMidPoint = (p1, p2) => {
            return new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2);
        };

        for (let i = 0; i < subdivisions; i++) {
            const faces2 = [];
            const midPointCache = new Map();
            for (const tri of faces) {
                const v1 = vertices[tri[0]];
                const v2 = vertices[tri[1]];
                const v3 = vertices[tri[2]];

                const key12 = `${Math.min(tri[0], tri[1])},${Math.max(tri[0], tri[1])}`;
                const key23 = `${Math.min(tri[1], tri[2])},${Math.max(tri[1], tri[2])}`;
                const key31 = `${Math.min(tri[2], tri[0])},${Math.max(tri[2], tri[0])}`;

                let m12 = midPointCache.get(key12);
                if (!m12) {
                    m12 = getMidPoint(v1, v2);
                    midPointCache.set(key12, m12);
                    vertices.push(m12);
                }
                let m23 = midPointCache.get(key23);
                if (!m23) {
                    m23 = getMidPoint(v2, v3);
                    midPointCache.set(key23, m23);
                    vertices.push(m23);
                }
                let m31 = midPointCache.get(key31);
                if (!m31) {
                    m31 = getMidPoint(v3, v1);
                    midPointCache.set(key31, m31);
                    vertices.push(m31);
                }
                
                const i12 = vertices.indexOf(m12);
                const i23 = vertices.indexOf(m23);
                const i31 = vertices.indexOf(m31);

                faces2.push([tri[0], i12, i31]);
                faces2.push([tri[1], i23, i12]);
                faces2.push([tri[2], i31, i23]);
                faces2.push([i12, i23, i31]);
            }
            faces = faces2;
        }

        // Normalize vertices to form a sphere and apply radius and position
        vertices.forEach(p => {
            const len = Math.hypot(p.x, p.y, p.z);
            p.x = this.x + (p.x / len) * this.radius;
            p.y = this.y + (p.y / len) * this.radius;
            p.z = this.z + (p.z / len) * this.radius;
            
            p.nx = (p.x - this.x) / this.radius;
            p.ny = (p.y - this.y) / this.radius;
            p.nz = (p.z - this.z) / this.radius;
        });

        // Create new, unshared vertices for each triangle to allow for sharp, per-face coloring
        faces.forEach((face, index) => {
            const v1_shared = vertices[face[0]];
            const v2_shared = vertices[face[1]];
            const v3_shared = vertices[face[2]];

            // Create deep copies for the new triangle
            const v1 = new Point(v1_shared.x, v1_shared.y, v1_shared.z);
            const v2 = new Point(v2_shared.x, v2_shared.y, v2_shared.z);
            const v3 = new Point(v3_shared.x, v3_shared.y, v3_shared.z);
            
            [v1, v2, v3].forEach(v => {
                v.nx = (v.x - this.x) / this.radius;
                v.ny = (v.y - this.y) / this.radius;
                v.nz = (v.z - this.z) / this.radius;
            });

            if (use_color && index % 2 === 0) {
                [v1, v2, v3].forEach(v => {
                    v.r = 0.2;
                    v.g = 0.2;
                });
            }

            this.mesh.push(new Triangle(v1, v2, v3));
        });

        this.updatePointList();
        this.setup_complete = true;
    }

    deform(other) {
        if (this.pressure + other.pressure === 0) return;

        const Vx = this.x - other.x;
        const Vy = this.y - other.y;
        const Vz = this.z - other.z;

        // 1. Identify unique vertices and calculate their deformed positions
        const deformed_positions = new Map();
        const get_key = p => `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`;

        this.point_list.forEach(P => {
            const key = get_key(P);
            if (!deformed_positions.has(key)) {
                const d_sq = (P.x - other.x) ** 2 + (P.y - other.y) ** 2 + (P.z - other.z) ** 2;
                let new_pos = { x: P.x, y: P.y, z: P.z };

                if (d_sq < other.radius ** 2) {
                    const a = Vx * Vx + Vy * Vy + Vz * Vz;
                    const b = Vx * (P.x - other.x) + Vy * (P.y - other.y) + Vz * (P.z - other.z);
                    const c = d_sq - other.radius ** 2;
                    const D = b * b - a * c;

                    if (D >= 0) {
                        const t2 = (-Math.sqrt(D) - b) / a;
                        const t = (t2 > 0) ? t2 : (Math.sqrt(D) - b) / a;
                        if (t > 0) {
                            const Ix = P.x + t * Vx;
                            const Iy = P.y + t * Vy;
                            const Iz = P.z + t * Vz;
                            const factor = other.pressure / (this.pressure + other.pressure);
                            new_pos.x = P.x + (Ix - P.x) * factor;
                            new_pos.y = P.y + (Iy - P.y) * factor;
                            new_pos.z = P.z + (Iz - P.z) * factor;
                        }
                    }
                }
                deformed_positions.set(key, new_pos);
            }
        });

        // 2. Apply the stored deformed positions to all vertices
        this.point_list.forEach(P => {
            const new_pos = deformed_positions.get(get_key(P));
            if (new_pos) {
                P.x = new_pos.x;
                P.y = new_pos.y;
                P.z = new_pos.z;
            }
        });

        // 3. Recalculate normals for all triangles
        this.mesh.forEach(triangle => {
            const { a, b, c } = triangle;
            const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
            const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
            const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
            const dn = Math.hypot(nx, ny, nz) || 1;
            const normal = { nx: nx / dn, ny: ny / dn, nz: nz / dn };
            a.nx = b.nx = c.nx = normal.nx;
            a.ny = b.ny = c.ny = normal.ny;
            a.nz = b.nz = c.nz = normal.nz;
        });
    }
    
    updatePointList() {
        this.point_list = [];
        for (const tri of this.mesh) {
            this.point_list.push(tri.a, tri.b, tri.c);
        }
    }
}