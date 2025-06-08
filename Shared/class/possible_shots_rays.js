// BAHAH tout cette enmeerde pour calculer les angles de rebonds
// Et au final plus lent que la première méthode
// j'en peux plus

class possible_shot_points {
  constructor(
    initial_position,
    initial_angle,
    launched_pos,
    launched_direction,
    initial_player,
    bounce = 0
  ) {
    this.initial_player = structuredClone(initial_player);
    this.initial_position = structuredClone(initial_position);
    this.position = structuredClone(initial_position);
    this.launched_pos = structuredClone(launched_pos);

    this.launched_direction = structuredClone(launched_direction);
    this.bounces_pos = [];
    this.bounce = bounce;
  }

  update_position() {
    if (this.bounce >= 3) {
      return;
    }

    let closest = null;
    let closest_edge_normal = null;

    Bcollision.forEach((block) => {
      const edges = getEdges({
        x: block.position.x,
        y: block.position.y,
        w: block.size.w,
        h: block.size.h,
      });

      for (const [p1, p2] of edges) {
        const pt = intersectRaySegment(
          this.launched_pos,
          this.launched_direction,
          p1,
          p2
        );

        if (pt && (!closest || pt.dist < closest.dist)) {
          if (pt.dist > 4) {
            closest = pt;
            closest_edge_normal = calculateNormal(p1, p2);
          }
        }
      }
    });

    if (closest) {
      this.bounces_pos.push(closest);

      let new_launched_direction = structuredClone(this.launched_direction);
      if (closest_edge_normal.x > 0) {
        new_launched_direction.x = -this.launched_direction.x;
      } else if (closest_edge_normal.x < 0) {
        new_launched_direction.x = -this.launched_direction.x;
      }
      if (closest_edge_normal.y > 0) {
        new_launched_direction.y = -this.launched_direction.y;
      } else if (closest_edge_normal.y < 0) {
        new_launched_direction.y = -this.launched_direction.y;
      }

      new possible_shot_points(
        this.initial_position,
        this.initial_angle,
        {
          x: closest.x,
          y: closest.y,
        },
        new_launched_direction,
        this.initial_player,
        this.bounce + 1
      ).update_position();

      this.draw();
      return;
    }
  }
  draw() {
    drawBlockNormals();
  }
}

function launch_possible_shots(N) {
  for (socketid in players) {
    player = players[socketid];
    for (let i = 0; i < N; i++) {
      const angle = (i * Math.PI * 2) / N;

      const shot = new possible_shot_points(
        {
          x: player.position.x + player.size.w / 2,
          y: player.position.y + player.size.h / 2,
        },
        angle,
        {
          x: player.position.x + player.size.w / 2,
          y: player.position.y + player.size.h / 2,
        },
        {
          x: Math.cos(angle),
          y: -Math.sin(angle),
        },
        player,
        0
      );
      shot.update_position();
    }
  }
}

function rectRect(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
  if (
    r1x + r1w >= r2x &&
    r1x <= r2x + r2w &&
    r1y + r1h >= r2y &&
    r1y <= r2y + r2h
  ) {
    return true;
  }
  return false;
}

function detectCollisions(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
  if (
    r1x + r1w >= r2x &&
    r1x <= r2x + r2w &&
    r1y + r1h >= r2y &&
    r1y <= r2y + r2h
  ) {
    const overlapLeft = r1x + r1w - r2x;
    const overlapRight = r2x + r2w - r1x;
    const overlapTop = r1y + r1h - r2y;
    const overlapBottom = r2y + r2h - r1y;

    const minOverlap = Math.min(
      overlapLeft,
      overlapRight,
      overlapTop,
      overlapBottom
    );

    if (minOverlap === overlapLeft) return "left";
    if (minOverlap === overlapRight) return "right";
    if (minOverlap === overlapTop) return "top";
    if (minOverlap === overlapBottom) return "bottom";
  }
  return "";
}

function calculateNormal(p1, p2) {
  const edgeVector = { x: p2.x - p1.x, y: p2.y - p1.y };
  const edgeLength = Math.sqrt(edgeVector.x ** 2 + edgeVector.y ** 2);

  return {
    x: edgeVector.y / edgeLength,
    y: -edgeVector.x / edgeLength,
  };
}

function drawBlockNormals() {
  Bcollision.forEach((block) => {
    const edges = getEdges({
      x: block.position.x,
      y: block.position.y,
      w: block.size.w,
      h: block.size.h,
    });

    edges.forEach(([p1, p2]) => {
      const normal = calculateNormal(p1, p2);

      c.strokeStyle = "blue";
      c.beginPath();
      c.moveTo(p1.x, p1.y);
      c.lineTo(p2.x, p2.y);
      c.stroke();

      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
      c.strokeStyle = "green";
      c.beginPath();
      c.moveTo(midPoint.x, midPoint.y);
      c.lineTo(midPoint.x + normal.x * 20, midPoint.y + normal.y * 20);
      c.stroke();
    });
  });
}
