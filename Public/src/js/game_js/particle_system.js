class Particle {
  constructor(position, angle, speed, radius, steps, timelife) {
    this.position = position;
    this.angle = angle;
    this.speed = speed;
    this.steps = steps;
    this.timealive = 0;
    this.timelife = timelife;
    this.radius = radius;
    this.velocity = {
      x: -Math.cos(this.angle) * this.speed,
      y: -Math.sin(this.angle) * this.speed,
    };
  }
  update() {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.radius =
      this.radius * (1 - 0.3 * (this.timealive / this.timelife) ** 3);
    this.velocity.x =
      this.velocity.x * (1 - 0.3 * (this.timealive / this.timelife) ** 4);
    this.velocity.y =
      this.velocity.y * (1 - 0.3 * (this.timealive / this.timelife) ** 4);
    this.timealive++;
    this.draw();
  }
  draw() {
    fc.beginPath();
    fc.arc(
      this.position.x,
      this.position.y,
      this.radius,
      0,
      2 * Math.PI,
      false
    );
    fc.fillStyle = steppingradient(this.steps, this.timealive / this.timelife);
    fc.fill();
    fc.closePath();

    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI, false);
    c.fillStyle = steppingradient(this.steps, this.timealive / this.timelife);
    c.fill();
    c.closePath();
  }
}

class Chockwave {
  constructor(position, speed, radius, width, startColor, endColor, timelife) {
    this.position = position;
    this.speed = speed;
    this.width = width;
    this.startColor = startColor;
    this.endColor = endColor;
    this.timealive = 0;
    this.timelife = timelife;
    this.radius = radius;
  }
  update() {
    this.speed = this.speed * 0.99;
    this.radius += this.speed;
    this.width = this.width * 0.8;
    this.timealive++;
    this.draw();
  }
  draw() {
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);
    c.arc(
      this.position.x,
      this.position.y,
      this.radius + this.width,
      0,
      Math.PI * 2,
      true
    );
    c.fillStyle = gradientcolor(
      this.startColor,
      this.endColor,
      this.timealive / this.timelife
    );
    c.fill();
    c.closePath();
  }
}

particles = [];
chockwaves = [];

function gradientcolor(startColor, endColor, percentFade) {
  var diffRed = endColor.red - startColor.red;
  var diffGreen = endColor.green - startColor.green;
  var diffBlue = endColor.blue - startColor.blue;
  diffRed = diffRed * percentFade + startColor.red;
  diffGreen = diffGreen * percentFade + startColor.green;
  diffBlue = diffBlue * percentFade + startColor.blue;
  return `rgb(${diffRed},${diffGreen},${diffBlue})`;
}

function steppingradient(steps, percentFade) {
  current_step = 0;
  for (let e = 0; e < steps.length; e++) {
    if (steps[e].percent < percentFade) {
      current_step = e;
    }
  }
  begin = steps[current_step].percent;
  if (current_step < steps.length - 1) {
    end = steps[current_step + 1].percent;
  } else {
    end = 1;
  }
  return gradientcolor(
    steps[current_step].color,
    steps[current_step + 1].color,
    (percentFade - begin) / (end - begin)
  );
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomNormal(min, max) {
  return randn_bm() * (max - min) + min;
}

function randn_bm() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5;
  if (num > 1 || num < 0) return randn_bm();
  return num;
}

socket.on("ricochet_explosion", (data) => {
  console.log("ricochet_explosion", data);
  ricochet_sparks(data.position, data.angle, 20);
});

socket.on("bullet_explosion", (data) => {
  bullet_explosion(data.position, 100);
});

socket.on("shoot_explosion", (data) => {
  shoot_explosion(data.position, data.angle, 30);
});

socket.on("player_explosion", (data) => {
  explosion(data.position, 100);
});

socket.on("mine_explosion", (data) => {
  explosion(data.position, 100);
});

function fast_bullets(position, angle, num) {
  angle = angle - Math.PI;
  for (let e = 0; e < num; e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        angle + getRandomNormal((-150 * Math.PI) / 180, (150 * Math.PI) / 180),
        getRandomArbitrary(0, -5),
        getRandomArbitrary(2, 4),
        [
          {
            color: {
              red: 255,
              green: 0,
              blue: 0,
            },
            percent: 0,
          },
          {
            color: {
              red: 255,
              green: 255,
              blue: 255,
            },
            percent: 1,
          },
        ],
        7
      )
    );
  }
}

function ricochet_sparks(position, angle, num) {
  for (let e = 0; e < num; e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        angle + getRandomNormal((-50 * Math.PI) / 180, (50 * Math.PI) / 180),
        getRandomArbitrary(0, 2),
        getRandomArbitrary(1, 3),
        [
          {
            color: {
              red: 255,
              green: 255,
              blue: 255,
            },
            percent: 0,
          },
          {
            color: {
              red: 245,
              green: 251,
              blue: 0,
            },
            percent: 1,
          },
        ],
        50
      )
    );
  }
}

function ricochet_explosion(position, angle, num) {
  for (let e = 0; e < num; e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        angle + getRandomNormal((-20 * Math.PI) / 180, (20 * Math.PI) / 180),
        getRandomArbitrary(2.5, 4),
        getRandomArbitrary(4, 6),
        [
          {
            color: {
              red: 255,
              green: Math.floor(getRandomArbitrary(220, 260)),
              blue: 39,
            },
            percent: 0,
          },
          {
            color: {
              red: 255,
              green: Math.floor(getRandomArbitrary(100, 120)),
              blue: 39,
            },
            percent: 0.1,
          },
          {
            color: {
              red: Math.floor(getRandomArbitrary(40, 60)),
              green: Math.floor(getRandomArbitrary(40, 60)),
              blue: Math.floor(getRandomArbitrary(40, 60)),
            },
            percent: 0.3,
          },
          {
            color: {
              red: Math.floor(getRandomArbitrary(220, 240)),
              green: Math.floor(getRandomArbitrary(220, 240)),
              blue: Math.floor(getRandomArbitrary(220, 240)),
            },
            percent: 1,
          },
        ],
        30
      )
    );
  }
}

function shoot_explosion(position, angle, num) {
  chockwaves.push(
    new Chockwave(
      structuredClone(position),
      10,
      0,
      2,
      { red: 255, green: 220, blue: 0 },
      { red: 255, green: 220, blue: 0 },
      5
    )
  );
  for (let e = 0; e < num; e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        angle + getRandomNormal((-60 * Math.PI) / 180, (60 * Math.PI) / 180),
        getRandomArbitrary(0.3, 3),
        getRandomArbitrary(5, 10),
        [
          {
            color: {
              red: 255,
              green: Math.floor(getRandomArbitrary(220, 260)),
              blue: 39,
            },
            percent: 0,
          },
          {
            color: {
              red: 255,
              green: Math.floor(getRandomArbitrary(100, 120)),
              blue: 39,
            },
            percent: 0.1,
          },
          {
            color: {
              red: Math.floor(getRandomArbitrary(40, 60)),
              green: Math.floor(getRandomArbitrary(40, 60)),
              blue: Math.floor(getRandomArbitrary(40, 60)),
            },
            percent: 0.3,
          },
          {
            color: {
              red: Math.floor(getRandomArbitrary(220, 240)),
              green: Math.floor(getRandomArbitrary(220, 240)),
              blue: Math.floor(getRandomArbitrary(220, 240)),
            },
            percent: 1,
          },
        ],
        60
      )
    );
  }
}

function explosion(position, num) {
  chockwaves.push(
    new Chockwave(
      structuredClone(position),
      10,
      0,
      13,
      { red: 255, green: 220, blue: 0 },
      { red: 255, green: 220, blue: 0 },
      30
    )
  );
  for (let e = 0; e < num; e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        getRandomArbitrary(0, 360),
        getRandomArbitrary(0, 4),
        getRandomArbitrary(5, 15),
        [
          {
            color: {
              red: 255,
              green: Math.floor(getRandomArbitrary(220, 260)),
              blue: 39,
            },
            percent: 0,
          },
          {
            color: {
              red: 255,
              green: Math.floor(getRandomArbitrary(100, 120)),
              blue: 39,
            },
            percent: 0.4,
          },
          {
            color: {
              red: Math.floor(getRandomArbitrary(40, 60)),
              green: Math.floor(getRandomArbitrary(40, 60)),
              blue: Math.floor(getRandomArbitrary(40, 60)),
            },
            percent: 0.6,
          },
          {
            color: {
              red: Math.floor(getRandomArbitrary(220, 240)),
              green: Math.floor(getRandomArbitrary(220, 240)),
              blue: Math.floor(getRandomArbitrary(220, 240)),
            },
            percent: 1,
          },
        ],
        40
      )
    );
  }
  for (let e = 0; e < Math.floor(num / 10); e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        getRandomArbitrary(0, 360),
        getRandomArbitrary(4, 7),
        getRandomArbitrary(1.5, 2),
        [
          { color: { red: 245, green: 251, blue: 0 }, percent: 0 },
          { color: { red: 240, green: 251, blue: 249 }, percent: 0.31 },
          { color: { red: 255, green: 255, blue: 255 }, percent: 0.52 },
          { color: { red: 252, green: 255, blue: 182 }, percent: 0.8 },
          { color: { red: 255, green: 239, blue: 90 }, percent: 1 },
        ],
        40
      )
    );
  }
}

function bullet_explosion(position, num) {
  chockwaves.push(
    new Chockwave(
      structuredClone(position),
      10,
      0,
      13,
      { red: 255, green: 220, blue: 0 },
      { red: 255, green: 220, blue: 0 },
      10
    )
  );
  for (let e = 0; e < num; e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        getRandomArbitrary(0, 360),
        getRandomArbitrary(0, 2),
        getRandomArbitrary(2.5, 7.5),
        [
          {
            color: {
              red: 255,
              green: Math.floor(getRandomArbitrary(220, 260)),
              blue: 39,
            },
            percent: 0,
          },
          {
            color: {
              red: 255,
              green: Math.floor(getRandomArbitrary(100, 120)),
              blue: 39,
            },
            percent: 0.4,
          },
          {
            color: {
              red: Math.floor(getRandomArbitrary(40, 60)),
              green: Math.floor(getRandomArbitrary(40, 60)),
              blue: Math.floor(getRandomArbitrary(40, 60)),
            },
            percent: 0.6,
          },
          {
            color: {
              red: Math.floor(getRandomArbitrary(220, 240)),
              green: Math.floor(getRandomArbitrary(220, 240)),
              blue: Math.floor(getRandomArbitrary(220, 240)),
            },
            percent: 1,
          },
        ],
        20
      )
    );
  }
  for (let e = 0; e < Math.floor(num / 10); e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        getRandomArbitrary(0, 360),
        getRandomArbitrary(2, 3),
        getRandomArbitrary(1.5, 2),
        [
          { color: { red: 245, green: 251, blue: 0 }, percent: 0 },
          { color: { red: 238, green: 136, blue: 136 }, percent: 0 },
          { color: { red: 240, green: 251, blue: 249 }, percent: 0.31 },
          { color: { red: 255, green: 255, blue: 255 }, percent: 0.52 },
          { color: { red: 252, green: 255, blue: 182 }, percent: 0.8 },
          { color: { red: 255, green: 239, blue: 90 }, percent: 1 },
        ],
        35
      )
    );
  }
}
