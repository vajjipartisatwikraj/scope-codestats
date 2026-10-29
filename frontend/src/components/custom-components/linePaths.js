/**
 * Path builders shared by the line-based charts (LineChart, TrendChart). Plain functions: they take
 * points ({ x, y } in px) and return the d of an SVG path.
 */
const round2 = (n) => Math.round(n * 100) / 100;

/** A smooth curve through the points that never overshoots them (Fritsch-Carlson). */
export function smoothPath(points) {
  const count = points.length;
  const start = `M${round2(points[0].x)},${round2(points[0].y)}`;
  if (count === 1) return start;
  if (count === 2) return `${start}L${round2(points[1].x)},${round2(points[1].y)}`;

  const width = [];
  const slope = [];
  for (let i = 0; i < count - 1; i += 1) {
    width[i] = points[i + 1].x - points[i].x;
    slope[i] = width[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / width[i];
  }

  const tangent = new Array(count);
  tangent[0] = slope[0];
  tangent[count - 1] = slope[count - 2];
  for (let i = 1; i < count - 1; i += 1) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < count - 1; i += 1) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
    } else {
      const a = tangent[i] / slope[i];
      const b = tangent[i + 1] / slope[i];
      const size = a * a + b * b;
      if (size > 9) {
        const scale = 3 / Math.sqrt(size);
        tangent[i] = scale * a * slope[i];
        tangent[i + 1] = scale * b * slope[i];
      }
    }
  }

  let path = start;
  for (let i = 0; i < count - 1; i += 1) {
    const reach = width[i] / 3;
    const from = points[i];
    const to = points[i + 1];
    path += `C${round2(from.x + reach)},${round2(from.y + tangent[i] * reach)},${round2(to.x - reach)},${round2(
      to.y - tangent[i + 1] * reach
    )},${round2(to.x)},${round2(to.y)}`;
  }
  return path;
}

export function linearPath(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${round2(point.x)},${round2(point.y)}`).join('');
}

export function stepPath(points) {
  return points
    .map((point, index) => (index === 0 ? `M${round2(point.x)},${round2(point.y)}` : `H${round2(point.x)}V${round2(point.y)}`))
    .join('');
}

export const PATH_BUILDERS = { smooth: smoothPath, linear: linearPath, step: stepPath };

/** Runs of points that have a value; a gap ends a run unless gaps are connected. */
export function runsOf(points, connectGaps) {
  if (connectGaps) {
    const all = points.filter(Boolean);
    return all.length ? [all] : [];
  }
  const runs = [];
  let current = [];
  points.forEach((point) => {
    if (point) {
      current.push(point);
    } else if (current.length) {
      runs.push(current);
      current = [];
    }
  });
  if (current.length) runs.push(current);
  return runs;
}
