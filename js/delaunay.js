// js/delaunay.js

/**
 * Delaunay Triangulation Module using Bowyer-Watson Algorithm
 */
const Delaunay = {
  /**
   * Calculates the circumcircle (center and radius squared) for three points A, B, C.
   * @param {{x: number, y: number}} A - First point
   * @param {{x: number, y: number}} B - Second point
   * @param {{x: number, y: number}} C - Third point
   * @returns {{x: number, y: number, rSq: number} | null} The circumcircle properties or null if points are collinear.
   */
  getCircumcircle: function(A, B, C) {
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    if (Math.abs(d) < 0.000001) return null; // Collinear points

    const ux = ((A.x * A.x + A.y * A.y) * (B.y - C.y) + (B.x * B.x + B.y * B.y) * (C.y - A.y) + (C.x * C.x + C.y * C.y) * (A.y - B.y)) / d;
    const uy = ((A.x * A.x + A.y * A.y) * (C.x - B.x) + (B.x * B.x + B.y * B.y) * (A.x - C.x) + (C.x * C.x + C.y * C.y) * (B.x - A.x)) / d;
    
    // Circumradius squared
    const rSq = (A.x - ux) * (A.x - ux) + (A.y - uy) * (A.y - uy);

    return { x: ux, y: uy, rSq: rSq };
  },

  /**
   * Triangulates a set of 2D points.
   * @param {Array<{x: number, y: number}>} points - Key points list.
   * @returns {Array<{p1: Object, p2: Object, p3: Object}>} Array of triangles.
   */
  triangulate: function(points) {
    if (points.length < 3) return [];

    // 1. Compute bounding box of point set
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const dx = maxX - minX;
    const dy = maxY - minY;
    const deltaMax = Math.max(dx, dy);
    const midX = minX + dx * 0.5;
    const midY = minY + dy * 0.5;

    // 2. Define a super-triangle that encompasses all points
    // Using vertices far outside the bounding box
    const sp1 = { x: midX - 20 * deltaMax, y: midY - deltaMax };
    const sp2 = { x: midX, y: midY + 20 * deltaMax };
    const sp3 = { x: midX + 20 * deltaMax, y: midY - deltaMax };

    let triangles = [
      {
        p1: sp1, p2: sp2, p3: sp3,
        circle: this.getCircumcircle(sp1, sp2, sp3)
      }
    ];

    // 3. Insert points one by one
    for (const p of points) {
      const badTriangles = [];
      const goodTriangles = [];

      // Determine which triangles have circumcircles that contain the point
      for (const t of triangles) {
        if (!t.circle) continue;
        const distSq = (p.x - t.circle.x) * (p.x - t.circle.x) + (p.y - t.circle.y) * (p.y - t.circle.y);
        
        // Use a tiny epsilon to handle float rounding errors
        if (distSq < t.circle.rSq - 0.0001) {
          badTriangles.push(t);
        } else {
          goodTriangles.push(t);
        }
      }

      // Find the boundary edges of the polygonal hole
      // A boundary edge is an edge that belongs to EXACTLY one bad triangle
      const edges = [];
      for (const t of badTriangles) {
        edges.push([t.p1, t.p2]);
        edges.push([t.p2, t.p3]);
        edges.push([t.p3, t.p1]);
      }

      const boundaryEdges = [];
      for (let i = 0; i < edges.length; i++) {
        let isShared = false;
        for (let j = 0; j < edges.length; j++) {
          if (i === j) continue;
          if (this.areEdgesEqual(edges[i], edges[j])) {
            isShared = true;
            break;
          }
        }
        if (!isShared) {
          boundaryEdges.push(edges[i]);
        }
      }

      // Reinitialize triangles with only the non-affected (good) triangles
      triangles = goodTriangles;

      // Create new triangles from the inserted point to all boundary edges
      for (const edge of boundaryEdges) {
        const circle = this.getCircumcircle(edge[0], edge[1], p);
        if (circle) {
          triangles.push({
            p1: edge[0],
            p2: edge[1],
            p3: p,
            circle: circle
          });
        }
      }
    }

    // 4. Remove any triangles that share vertices with the super-triangle
    const result = [];
    for (const t of triangles) {
      const sharesSuper = 
        this.arePointsEqual(t.p1, sp1) || this.arePointsEqual(t.p1, sp2) || this.arePointsEqual(t.p1, sp3) ||
        this.arePointsEqual(t.p2, sp1) || this.arePointsEqual(t.p2, sp2) || this.arePointsEqual(t.p2, sp3) ||
        this.arePointsEqual(t.p3, sp1) || this.arePointsEqual(t.p3, sp2) || this.arePointsEqual(t.p3, sp3);
      
      if (!sharesSuper) {
        result.push(t);
      }
    }

    return result;
  },

  /**
   * Helper to verify if two points are equal within epsilon tolerance.
   */
  arePointsEqual: function(p1, p2) {
    return Math.abs(p1.x - p2.x) < 0.0001 && Math.abs(p1.y - p2.y) < 0.0001;
  },

  /**
   * Helper to verify if two edges are equal (order of vertices does not matter).
   */
  areEdgesEqual: function(e1, e2) {
    return (this.arePointsEqual(e1[0], e2[0]) && this.arePointsEqual(e1[1], e2[1])) ||
           (this.arePointsEqual(e1[0], e2[1]) && this.arePointsEqual(e1[1], e2[0]));
  }
};
