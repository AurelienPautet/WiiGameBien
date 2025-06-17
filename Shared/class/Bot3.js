class Bot3 extends Bot {
  constructor(position, socketid, name, turretc, bodyc) {
    super(position, socketid, name, turretc, bodyc);
    this.shoot_max_bounce = 1;

    this.min_interval_shoot = 90;
    this.max_rotation_speed = Math.PI / 50;
    this.max_bulletcount = 3;
    this.shoot_speed = 10;
    this.precision = 0.01; //default 0.2
    this.number_of_rays = 50;
    this.size_of_rays = 10;
    this.steps_of_rays = 10;
    this.can = {
      move: true,
      shoot: true,
      plant: true,
      spam: true,
    };
  }
}
