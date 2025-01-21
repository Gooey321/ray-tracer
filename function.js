export function trace(origin, direction, steps, bvh) {
  const stack = [{ origin, direction, steps, contribution: 1 }];
  let finalColor = new Vector(0, 0, 0);

  while (stack.length > 0) {
    const { origin, direction, steps, contribution } = stack.pop();
    const intersect = intersectBVH(origin, direction, bvh);

    if (intersect.collided && steps > 0) {
      const reflectedDir = reflect(direction, intersect.normal);
      stack.push({
        origin: intersect.point,
        direction: reflectedDir,
        steps: steps - 1,
        contribution: contribution * 0.9,
      });

      // Add ambient light
      const ambientLight = 0.1;
      const ambient = new Vector(ambientLight, ambientLight, ambientLight);

      const reflected = Vector.mulComponents(
        intersect.object.reflectivity,
        ambient
      );

      const emission = Vector.add(
        Vector.mul(intersect.object.emission, contribution),
        Vector.mul(reflected, contribution)
      );
      finalColor = Vector.add(finalColor, emission);
    }
  }

  return finalColor;
}

export function intersectBVH(origin, direction, node) {
  // Early exit if ray misses node bounds
  if (!node.bounds.intersect(origin, direction)) {
    return {
      collided: false,
      dist: Infinity,
    };
  }

  // Leaf node - test objects directly
  if (node.objects) {
    return intersection(origin, direction, node.objects);
  }

  // Interior node - recurse on children
  const leftHit = intersectBVH(origin, direction, node.left);
  const rightHit = intersectBVH(origin, direction, node.right);

  return leftHit.dist < rightHit.dist ? leftHit : rightHit;
}

export class BVHNode {
  constructor(objects, axis = 0) {
    this.left = null;
    this.right = null;
    this.bounds = null;
    this.objects = null;

    // Create leaf node if few objects
    if (objects.length <= 2) {
      this.objects = objects;
      this.bounds = objects.reduce(
        (box, obj) => AABB.union(box, AABB.fromSphere(obj)),
        null
      );
      return;
    }

    // Sort objects along axis
    objects.sort(
      (a, b) =>
        a.position[["x", "y", "z"][axis]] - b.position[["x", "y", "z"][axis]]
    );
    const mid = Math.floor(objects.length / 2);

    // Recursively build tree
    this.left = new BVHNode(objects.slice(0, mid), (axis + 1) % 3);
    this.right = new BVHNode(objects.slice(mid), (axis + 1) % 3);

    // Compute bounds
    this.bounds = AABB.union(this.left.bounds, this.right.bounds);
  }
}

export class AABB {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }

  static fromSphere(sphere) {
    const padding = sphere.emission ? sphere.radius * 2 : sphere.radius * 0.1;
    const r = sphere.radius + padding;
    const p = sphere.position;
    return new AABB(
      new Vector(p.x - r, p.y - r, p.z - r),
      new Vector(p.x + r, p.y + r, p.z + r)
    );
  }

  static union(a, b) {
    if (!a) return b;
    if (!b) return a;
    return new AABB(
      new Vector(
        Math.min(a.min.x, b.min.x),
        Math.min(a.min.y, b.min.y),
        Math.min(a.min.z, b.min.z)
      ),
      new Vector(
        Math.max(a.max.x, b.max.x),
        Math.max(a.max.y, b.max.y),
        Math.max(a.max.z, b.max.z)
      )
    );
  }

  intersect(origin, direction) {
    const invDir = new Vector(
      1.0 / direction.x,
      1.0 / direction.y,
      1.0 / direction.z
    );

    const t1 = Vector.mulComponents(Vector.sub(this.min, origin), invDir);
    const t2 = Vector.mulComponents(Vector.sub(this.max, origin), invDir);

    const tmin = Math.max(
      Math.max(Math.min(t1.x, t2.x), Math.min(t1.y, t2.y)),
      Math.min(t1.z, t2.z)
    );

    const tmax = Math.min(
      Math.min(Math.max(t1.x, t2.x), Math.max(t1.y, t2.y)),
      Math.max(t1.z, t2.z)
    );

    return tmax >= tmin && tmax > 0;
  }
}

export class Vector {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static add(a, b) {
    return new Vector(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static sub(a, b) {
    return new Vector(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static mul(v, s) {
    return new Vector(v.x * s, v.y * s, v.z * s);
  }

  static dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static normalize(v) {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (mag === 0) return new Vector(0, 0, 0);
    return new Vector(v.x / mag, v.y / mag, v.z / mag);
  }

  static mag(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  static mulComponents(a, b) {
    return new Vector(a.x * b.x, a.y * b.y, a.z * b.z);
  }

  clone() {
    return new Vector(this.x, this.y, this.z);
  }

  static centroid(vectors) {
    return vectors
      .reduce((acc, v) => Vector.add(acc, v), new Vector(0, 0, 0))
      .mul(1 / vectors.length);
  }
}

export function intersection(origin, direction, objects) {
  let minDistance = Infinity;
  let collided = false;
  let closestIntersection;
  let closestObject;

  for (const object of objects) {
    if (object.shape === "sphere") {
      const isect = sphereIntersection(origin, direction, object);
      if (isect.dist < minDistance) {
        closestIntersection = isect;
        closestObject = object;
        minDistance = isect.dist;
        collided = true;
      }
    }
  }

  return {
    collided,
    point: closestIntersection?.point ?? new Vector(0, 0, 0),
    dist: closestIntersection?.dist ?? Infinity,
    normal: closestIntersection?.normal ?? new Vector(0, 0, 0),
    object: closestObject,
  };
}

export function sphereIntersection(origin, direction, sphere) {
  const sphereRay = Vector.sub(sphere.position, origin);
  const distSphereRay = Vector.mag(sphereRay);
  const distToClosestPointOnRay = Vector.dot(sphereRay, direction);
  const distFromClosestPointToSphere = Math.sqrt(
    distSphereRay ** 2 - distToClosestPointOnRay ** 2
  );

  const distToIntersection =
    distToClosestPointOnRay -
    Math.sqrt(Math.abs(sphere.radius ** 2 - distFromClosestPointToSphere ** 2));

  const point = Vector.add(origin, Vector.mul(direction, distToIntersection));
  let normal = Vector.normalize(Vector.sub(point, sphere.position));

  normal = Vector.normalize(
    Vector.add(
      normal,
      Vector.mul(
        new Vector(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ),
        sphere.roughness
      )
    )
  );

  if (
    distToClosestPointOnRay > 0 &&
    distFromClosestPointToSphere < sphere.radius
  ) {
    return {
      collided: true,
      dist: distToIntersection,
      point,
      normal,
    };
  }

  return {
    collided: false,
    dist: Infinity,
  };
}

export function reflect(direction, normal) {
  const normalLength = Vector.dot(direction, normal) * 2;
  return Vector.sub(direction, Vector.mul(normal, normalLength));
}
