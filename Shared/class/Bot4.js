class Bot4 extends Bot {
  constructor(position, socketid, name, turretc, bodyc) {
    super(position, socketid, name, turretc, bodyc);
    this.shoot_max_bounce = 3;

    this.min_interval_shoot = 90;
    this.max_rotation_speed = Math.PI / 80;
    this.max_bulletcount = 3;
    this.shoot_speed = 10;
    this.precision = 0.01; //default 0.2
    this.number_of_rays = 50;
    this.size_of_rays = 5;
    this.steps_of_rays = 5;
    this.bullet_size = {
      w: 20,
      h: 20,
    };
    this.can = {
      move: false,
      shoot: true,
      plant: true,
      spam: true,
    };
    this.bullet_type = 2;
  }
}
