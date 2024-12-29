class Particle {
  constructor(position, angle, speed, radius, steps, timelife) {
    this.position = position;
    this.angle = angle;
    this.speed = speed;
    //list of colors the particle will fade through with the percent of the timelife
    this.steps = steps;
    //time since the particle was created
    this.timealive = 0;
    //time the particle will live
    this.timelife = timelife;
    this.radius = radius;
    //velocity of the particle
    this.velocity = {
      x: -Math.cos((this.angle * 3.14) / 180) * this.speed,
      y: -Math.sin((this.angle * 3.14) / 180) * this.speed,
    };
  }
  update() {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    //reduce the radius of the particle as it gets older
    this.radius =
      this.radius * (1 - 0.3 * (this.timealive / this.timelife) ** 3);

    //reduce the velocity of the particle as it gets older
    this.velocity.x =
      this.velocity.x * (1 - 0.3 * (this.timealive / this.timelife) ** 4);
    this.velocity.y =
      this.velocity.y * (1 - 0.3 * (this.timealive / this.timelife) ** 4);

    //increase the time alive
    this.timealive++;
    this.draw();
  }
  draw() {
    //draw a circle to represent the particle
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI, false);
    // get the gradient current color of the particle
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

    //colors of the chockwave
    this.startColor = startColor;
    this.endColor = endColor;

    //time since the particle was created
    this.timealive = 0;
    //time the particle will live
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
    //draw a circle to represent the chockwave
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false); // outer (filled)
    c.arc(
      this.position.x,
      this.position.y,
      this.radius + this.width,
      0,
      Math.PI * 2,
      true
    );

    // get the gradient current color of the chockwave
    c.fillStyle = gradientcolor(
      this.startColor,
      this.endColor,
      this.timealive / this.timelife
    );
    c.fill();
    c.closePath();
  }
}

//array to store all the particles
particles = [];
//array to store all the chockwaves
chockwaves = [];

function gradientcolor(startColor, endColor, percentFade) {
  // create a gradient color between two colors based on the percentFade value

  //calculate the difference between the two colors
  var diffRed = endColor.red - startColor.red;
  var diffGreen = endColor.green - startColor.green;
  var diffBlue = endColor.blue - startColor.blue;

  //calculate the new color based on the percentFade
  diffRed = diffRed * percentFade + startColor.red;
  diffGreen = diffGreen * percentFade + startColor.green;
  diffBlue = diffBlue * percentFade + startColor.blue;

  //return the new color
  return `rgb(${diffRed},${diffGreen},${diffBlue})`;
}

function steppingradient(steps, percentFade) {
  // get the gradient with different steps of color of the particle based on the percentFade value

  //sotres the current step of the particle
  current_step = 0;

  //get the current step of the particle
  for (let e = 0; e < steps.length; e++) {
    if (steps[e].percent < percentFade) {
      current_step = e;
    }
  }
  //get the begin and end of the current step percent
  begin = steps[current_step].percent;
  if (current_step < steps.length - 1) {
    end = steps[current_step + 1].percent;
  } else {
    end = 1;
  }

  //return the gradient color of the particle
  return gradientcolor(
    steps[current_step].color,
    steps[current_step + 1].color,
    (percentFade - begin) / (end - begin)
  );
}

function getRandomArbitrary(min, max) {
  //get a random number between min and max
  return Math.random() * (max - min) + min;
}

function getRandomNormal(min, max) {
  //get a random number between min and max with a normal distribution
  return randn_bm() * (max - min) + min;
}

function randn_bm() {
  //get a random number between 0 and 1 with a normal distribution
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return randn_bm(); // resample between 0 and 1
  return num;
}

socket.on("ricochet_explosion", (position, angle) => {
  ricochet_sparks(position, angle, 20);
});

socket.on("bullet_explosion", (position) => {
  bullet_explosion(position, 100);
});

socket.on("shoot_explosion", (position, angle) => {
  shoot_explosion(position, angle, 30);
});

socket.on("player_explosion", (position) => {
  explosion(position, 100);
});

socket.on("mine_explosion", (position) => {
  explosion(position, 100);
});

function ricochet_sparks(position, angle, num) {
  //create the ricochet sparks particles and add them to the particles array
  for (let e = 0; e < num; e++) {
    particles.push(
      new Particle(
        structuredClone(position),
        angle + getRandomNormal(-50, 50),
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
        angle + getRandomNormal(-20, 20),
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
        angle + getRandomNormal(-60, 60),
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
